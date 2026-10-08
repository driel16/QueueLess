import type {
  AppointmentRequest,
  AppointmentRequestStatus,
} from '../appointments/appointment-requests';

export function isActiveAppointmentStatus(
  status: unknown,
): status is Extract<AppointmentRequestStatus, 'pending' | 'approved' | 'serving' | 'skipped'> {
  return (
    status === 'pending' ||
    status === 'approved' ||
    status === 'serving' ||
    status === 'skipped'
  );
}

export function getCallNextCandidates(requests: AppointmentRequest[]) {
  return requests
    .filter((request) => request.status === 'approved' && request.arrivedAt)
    .sort(compareQueueOrder);
}

export function getQueueEstimateOrder(requests: AppointmentRequest[]) {
  return requests
    .filter((request) => request.status === 'approved' || request.status === 'serving')
    .sort(
      (first, second) =>
        Number(second.status === 'serving') - Number(first.status === 'serving') ||
        compareQueueOrder(first, second),
    );
}

function compareQueueOrder(first: AppointmentRequest, second: AppointmentRequest) {
  return (
    (first.queueNumber ?? Number.MAX_SAFE_INTEGER) -
      (second.queueNumber ?? Number.MAX_SAFE_INTEGER) ||
    (first.createdAt?.getTime() ?? 0) - (second.createdAt?.getTime() ?? 0) ||
    first.id.localeCompare(second.id)
  );
}
