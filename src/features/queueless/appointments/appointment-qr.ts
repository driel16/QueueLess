const APPOINTMENT_QR_PREFIX = 'queueless:appointment:';

export function createAppointmentQrPayload(appointmentId: string) {
  return `${APPOINTMENT_QR_PREFIX}${appointmentId}`;
}

export function parseAppointmentQrPayload(payload: string) {
  if (!payload.startsWith(APPOINTMENT_QR_PREFIX)) return undefined;

  const appointmentId = payload.slice(APPOINTMENT_QR_PREFIX.length);
  return /^[A-Za-z0-9_-]{10,40}$/.test(appointmentId) ? appointmentId : undefined;
}
