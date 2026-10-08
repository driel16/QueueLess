import { describe, expect, it } from '@jest/globals';

import {
  createAppointmentQrPayload,
  parseAppointmentQrPayload,
} from '../appointment-qr';

describe('appointment QR payload', () => {
  it('round-trips a Firestore appointment id', () => {
    const payload = createAppointmentQrPayload('abc123xyz789');

    expect(parseAppointmentQrPayload(payload)).toBe('abc123xyz789');
  });

  it('rejects unrelated and malformed QR values', () => {
    expect(parseAppointmentQrPayload('https://example.com')).toBeUndefined();
    expect(parseAppointmentQrPayload('queueless:appointment:short')).toBeUndefined();
    expect(parseAppointmentQrPayload('queueless:appointment:abc/12345678')).toBeUndefined();
  });
});
