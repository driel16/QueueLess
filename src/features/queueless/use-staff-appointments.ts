import { useEffect, useRef, useState } from 'react';

import {
  refreshQueueEstimates,
  getOlderAppointmentRequests,
  reviewAppointmentRequest,
  subscribeToAppointmentRequests,
  type AppointmentRequest,
  type AppointmentRequestCursor,
  type AppointmentRequestStatus,
} from './appointment-requests';

const historyPageSize = 100;

function sortRequests(requests: AppointmentRequest[]) {
  return requests.sort(
    (first, second) =>
      second.date.localeCompare(first.date) ||
      (second.queueNumber ?? 0) - (first.queueNumber ?? 0) ||
      (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0),
  );
}

export function useStaffAppointments(
  options: {
    status?: AppointmentRequestStatus;
    date?: string;
    fromDate?: string;
    paginate?: boolean;
  } = {},
) {
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string>();
  const [subscriptionError, setSubscriptionError] = useState<string>();
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({});
  const previousRequestSignatureRef = useRef('');
  const previousQueueStateRef = useRef('');
  const liveRequestsRef = useRef<AppointmentRequest[]>([]);
  const olderRequestsRef = useRef(new Map<string, AppointmentRequest>());
  const pageCursorRef = useRef<AppointmentRequestCursor | undefined>(undefined);
  const hasLoadedOlderRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const isMountedRef = useRef(true);
  const { status, date, fromDate, paginate } = options;
  const pageSize = paginate ? historyPageSize : undefined;

  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;
    const repairingIds = new Set<string>();
    liveRequestsRef.current = [];
    olderRequestsRef.current.clear();
    pageCursorRef.current = undefined;
    hasLoadedOlderRef.current = false;
    loadingOlderRef.current = false;
    previousRequestSignatureRef.current = '';
    previousQueueStateRef.current = '';
    const unsubscribe = subscribeToAppointmentRequests(
      (items, cursor) => {
        const requestSignature = items
          .slice()
          .sort((first, second) => first.id.localeCompare(second.id));
        const serializedRequestSignature = JSON.stringify(requestSignature);

        if (serializedRequestSignature !== previousRequestSignatureRef.current) {
          previousRequestSignatureRef.current = serializedRequestSignature;
          if (pageSize) {
            const currentIds = new Set(items.map((item) => item.id));
            if (hasLoadedOlderRef.current) {
              liveRequestsRef.current.forEach((item) => {
                if (!currentIds.has(item.id) && !olderRequestsRef.current.has(item.id)) {
                  olderRequestsRef.current.set(item.id, item);
                }
              });
            }
            liveRequestsRef.current = items;
            if (!hasLoadedOlderRef.current) pageCursorRef.current = cursor;
            const mergedRequests = new Map(olderRequestsRef.current);
            items.forEach((item) => mergedRequests.set(item.id, item));
            setRequests(sortRequests(Array.from(mergedRequests.values())));
            if (!hasLoadedOlderRef.current) setHasMore(items.length === pageSize);
          } else {
            setRequests(items);
          }
        }

        setIsLoading(false);
        setSubscriptionError(undefined);

        if (!pageSize) {
          const requestsNeedingQueueNumbers = new Set(
            items
              .filter(
                (item) =>
                  item.status === 'approved' && typeof item.queueNumber !== 'number',
              )
              .map((item) => item.id),
          );
          setOperationErrors((current) => {
            const remaining = { ...current };
            let changed = false;
            Object.keys(remaining).forEach((key) => {
              if (key.startsWith('repair:') && !requestsNeedingQueueNumbers.has(key.slice(7))) {
                delete remaining[key];
                changed = true;
              }
            });
            return changed ? remaining : current;
          });

          const queueState = items
            .filter(
              (item) =>
                item.status === 'approved' ||
                item.status === 'serving' ||
                item.status === 'skipped',
            )
            .map((item) => `${item.id}:${item.date}:${item.status}:${item.queueNumber ?? ''}`)
            .sort()
            .join('|');

          if (queueState !== previousQueueStateRef.current) {
            previousQueueStateRef.current = queueState;
            refreshQueueEstimates(items).then(
              () => {
                if (isMounted) {
                  setOperationErrors((current) => {
                    if (!current.queue) return current;
                    const remaining = { ...current };
                    delete remaining.queue;
                    return remaining;
                  });
                }
              },
              (refreshError: unknown) => {
                if (isMounted) {
                  setOperationErrors((current) => ({
                    ...current,
                    queue:
                      refreshError instanceof Error
                        ? refreshError.message
                        : 'Could not refresh queue wait estimates.',
                  }));
                }
              },
            );
          }

          items
            .filter(
              (item) =>
                item.status === 'approved' && typeof item.queueNumber !== 'number',
            )
            .forEach((item) => {
              if (repairingIds.has(item.id)) return;
              repairingIds.add(item.id);
              reviewAppointmentRequest(item.id, 'approved')
                .then(
                  () => {
                    if (isMounted) {
                      setOperationErrors((current) => {
                        if (!current[`repair:${item.id}`]) return current;
                        const remaining = { ...current };
                        delete remaining[`repair:${item.id}`];
                        return remaining;
                      });
                    }
                  },
                  (repairError: unknown) => {
                    if (isMounted) {
                      setOperationErrors((current) => ({
                        ...current,
                        [`repair:${item.id}`]:
                          repairError instanceof Error
                            ? repairError.message
                            : `Could not assign a queue number for appointment ${item.id}.`,
                      }));
                    }
                  },
                )
                .finally(() => repairingIds.delete(item.id));
            });
        }
      },
      (loadError) => {
        setSubscriptionError(loadError.message);
        setIsLoading(false);
      },
      { status, date, fromDate, ...(pageSize ? { pageSize } : {}) },
    );
    return () => {
      isMounted = false;
      isMountedRef.current = false;
      previousRequestSignatureRef.current = '';
      previousQueueStateRef.current = '';
      unsubscribe();
    };
  }, [date, fromDate, pageSize, status]);

  async function loadOlder() {
    const cursor = pageCursorRef.current;
    if (!pageSize || !hasMore || !cursor || loadingOlderRef.current) return;

    loadingOlderRef.current = true;
    hasLoadedOlderRef.current = true;
    setIsLoadingOlder(true);
    setPaginationError(undefined);
    try {
      const page = await getOlderAppointmentRequests(cursor, pageSize);
      if (!isMountedRef.current) return;
      page.requests.forEach((item) => olderRequestsRef.current.set(item.id, item));
      if (page.cursor) pageCursorRef.current = page.cursor;
      const mergedRequests = new Map(olderRequestsRef.current);
      liveRequestsRef.current.forEach((item) => mergedRequests.set(item.id, item));
      setRequests(sortRequests(Array.from(mergedRequests.values())));
      setHasMore(page.hasMore);
    } catch (loadError) {
      if (isMountedRef.current) {
        setPaginationError(
          loadError instanceof Error ? loadError.message : 'Could not load older appointments.',
        );
      }
    } finally {
      loadingOlderRef.current = false;
      if (isMountedRef.current) setIsLoadingOlder(false);
    }
  }

  return {
    requests,
    isLoading,
    isLoadingOlder,
    hasMore,
    loadOlder,
    error: subscriptionError ?? paginationError ?? Object.values(operationErrors)[0],
  };
}
