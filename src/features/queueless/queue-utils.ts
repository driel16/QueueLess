import type { AppointmentRequest } from './appointment-requests';

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
