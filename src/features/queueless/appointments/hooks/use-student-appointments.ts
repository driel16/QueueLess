import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';

import {
  getOlderStudentAppointmentRequests,
  studentAppointmentPageSize,
  subscribeToStudentAppointmentRequests,
  type AppointmentRequest,
  type AppointmentRequestCursor,
} from '../appointment-requests';
import { getFirebaseAuth } from '@/lib/firebase';

function sortRequests(requests: AppointmentRequest[]) {
  return requests.sort(
    (first, second) =>
      second.date.localeCompare(first.date) ||
      (second.queueNumber ?? 0) - (first.queueNumber ?? 0) ||
      (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0),
  );
}

export function useStudentAppointments() {
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string>();
  const [paginationError, setPaginationError] = useState<string>();
  const liveRequestsRef = useRef<AppointmentRequest[]>([]);
  const olderRequestsRef = useRef(new Map<string, AppointmentRequest>());
  const pageCursorRef = useRef<AppointmentRequestCursor | undefined>(undefined);
  const hasLoadedOlderRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const isMountedRef = useRef(true);
  const previousRequestSignatureRef = useRef('');
  const authGenerationRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    let unsubscribeAppointments: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), (user) => {
      authGenerationRef.current += 1;
      const currentGeneration = authGenerationRef.current;
      unsubscribeAppointments?.();
      unsubscribeAppointments = undefined;

      liveRequestsRef.current = [];
      olderRequestsRef.current.clear();
      pageCursorRef.current = undefined;
      hasLoadedOlderRef.current = false;
      loadingOlderRef.current = false;
      previousRequestSignatureRef.current = '';
      setRequests([]);
      setHasMore(false);
      setSubscriptionError(undefined);
      setPaginationError(undefined);

      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      unsubscribeAppointments = subscribeToStudentAppointmentRequests(
        (items, cursor, pageHasMore) => {
          if (!isMountedRef.current || currentGeneration !== authGenerationRef.current) return;

          const serializedSignature = JSON.stringify(
            items
              .slice()
              .sort((first, second) => first.id.localeCompare(second.id)),
          );

          if (serializedSignature !== previousRequestSignatureRef.current) {
            previousRequestSignatureRef.current = serializedSignature;
            const currentIds = new Set(items.map((item) => item.id));
            liveRequestsRef.current.forEach((item) => {
              if (!currentIds.has(item.id) && !olderRequestsRef.current.has(item.id)) {
                olderRequestsRef.current.set(item.id, item);
              }
            });
            liveRequestsRef.current = items;
            if (!hasLoadedOlderRef.current) pageCursorRef.current = cursor;

            const mergedRequests = new Map(olderRequestsRef.current);
            items.forEach((item) => mergedRequests.set(item.id, item));
            setRequests(sortRequests(Array.from(mergedRequests.values())));
            if (!hasLoadedOlderRef.current) {
              setHasMore(pageHasMore ?? false);
            }
          }

          setIsLoading(false);
          setSubscriptionError(undefined);
        },
        (loadError) => {
          if (!isMountedRef.current || currentGeneration !== authGenerationRef.current) return;
          setSubscriptionError(loadError.message);
          setIsLoading(false);
        },
      );
    });

    return () => {
      isMountedRef.current = false;
      authGenerationRef.current += 1;
      previousRequestSignatureRef.current = '';
      unsubscribeAppointments?.();
      unsubscribeAuth();
    };
  }, []);

  async function loadOlder() {
    const cursor = pageCursorRef.current;
    if (!hasMore || !cursor || loadingOlderRef.current) return;

    const currentGeneration = authGenerationRef.current;
    loadingOlderRef.current = true;
    hasLoadedOlderRef.current = true;
    setIsLoadingOlder(true);
    setPaginationError(undefined);
    try {
      const page = await getOlderStudentAppointmentRequests(
        cursor,
        studentAppointmentPageSize,
      );
      if (!isMountedRef.current || currentGeneration !== authGenerationRef.current) return;

      page.requests.forEach((item) => olderRequestsRef.current.set(item.id, item));
      if (page.cursor) pageCursorRef.current = page.cursor;
      const mergedRequests = new Map(olderRequestsRef.current);
      liveRequestsRef.current.forEach((item) => mergedRequests.set(item.id, item));
      setRequests(sortRequests(Array.from(mergedRequests.values())));
      setHasMore(page.hasMore);
    } catch (loadError) {
      if (isMountedRef.current) {
        setPaginationError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load older appointments.',
        );
      }
    } finally {
      loadingOlderRef.current = false;
      if (isMountedRef.current) setIsLoadingOlder(false);
    }
  }

  const requestsWithLivePosition = requests.map((request) =>
    request.status === 'serving'
      ? { ...request, studentsAhead: 0, estimatedWaitMinutes: 0 }
      : request,
  );

  return {
    requests: requestsWithLivePosition,
    isLoading,
    isLoadingOlder,
    hasMore,
    loadOlder,
    error: subscriptionError,
    paginationError,
  };
}
