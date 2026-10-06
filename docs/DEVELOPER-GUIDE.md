# QueueLess Developer Guide

This guide describes the current app architecture and the student, staff, and QR check-in flows. It is based on the behavior implemented in the source; the app and Firestore rules are the source of truth if this document becomes outdated.

## What the app does

QueueLess is a mobile-first Expo and React Native application for campus service queues. Students request appointments and track queue status. Staff review requests, check students in, and operate the queue. An administrator reviews staff access applications.

The app uses Firebase Authentication for email/password accounts and Firestore for profiles, appointments, queue state, and service settings. The Firebase client is initialized lazily from `EXPO_PUBLIC_FIREBASE_*` environment variables.

## Code map

| Area | Location | Responsibility |
|---|---|---|
| File-based routes | `src/app/` | Expo Router route entry points; most re-export feature screens |
| Shared feature UI | `src/features/queueless/components.tsx` | Student/staff layouts, shared widgets, and QR ticket rendering |
| Authentication and profiles | `src/features/queueless/auth.ts` | Registration, verification, role checks, and staff application review |
| Appointment and queue operations | `src/features/queueless/appointment-requests.ts` | Firestore booking, review, check-in, serving, and completion operations |
| Queue ordering | `src/features/queueless/queue-utils.ts` | Ordering and candidate selection helpers |
| Schedule and service settings | `src/features/queueless/settings.ts` | Operating days/hours, closed dates, capacity, and service availability |
| Student screens | `src/features/queueless/screens/student/` | Booking, ticket, queue, profile, and appointment screens |
| Staff screens | `src/features/queueless/screens/staff/` | Request management, active queue, scanner, and settings |
| Firebase setup | `src/lib/firebase.ts` | Firebase app, Auth, and Firestore initialization |
| Database authorization | `firestore.rules` | Server-enforced authorization and allowed data transitions |

## Main navigation and roles

Expo Router maps files in `src/app/` to routes. The route files are intentionally thin; feature screens and flow logic live outside `src/app/`.

- **Student** — signs up, verifies email, browses enabled services, requests an appointment, and watches their queue.
- **Staff** — applies for access, verifies email, and waits for admin approval. Approved staff can manage appointment requests, queue service, availability, and schedule.
- **Admin** — a verified Firebase account with the configured admin email can approve or reject staff applications. Approval creates the staff role profile.

Role checks in the app improve the user experience, but Firestore rules are the actual security boundary. Do not rely on hidden buttons or route guards to protect data.

## Student appointment lifecycle

1. The student selects an enabled service and an operating date.
2. `submitAppointmentRequest` checks that the signed-in profile is a verified student and that the date is open.
3. A Firestore transaction creates `appointments/{appointmentId}` with `status: "pending"` and reserves date capacity in `appointmentCapacity/{date}`.
4. Staff review the pending request. Rejection releases the date capacity. Approval assigns a queue number and wait estimate, and updates `appointmentQueues/{date}`.
5. After approval, the student's live appointment listener updates the ticket and queue screens.
6. On the appointment date, staff scan the ticket and confirm arrival. Only checked-in approved appointments are eligible to be called next.
7. Staff call the next student, which changes the appointment to `serving` and updates the date's queue record.
8. The cashier and student each confirm the transaction is finished. The request becomes `completed` once both confirmations are present. Staff can also skip an in-progress appointment; skipped requests may be returned to the queue.

Typical status transitions:

```text
pending ── staff approves ──> approved ── staff calls ──> serving ── both confirm ──> completed
   └──── staff rejects ─────> rejected                   └── staff skips ──> skipped ──> approved
pending/approved ── appointment date passes without check-in ──> no-show
```

Queue number and estimated wait values are assigned/updated by the app's staff operations. Queue ordering is based on the assigned queue number, then creation time and document ID as tie-breakers.

`functions/src/index.ts` schedules `expireMissedAppointments` for 12:05 AM in `Asia/Manila` each day. It marks prior-day pending or approved appointments without `arrivedAt` as `no-show`, records `noShowAt`, and releases only the matching active-appointment lock. It does not change the capacity count for a past date. The transaction checks the appointment again before writing, so retries and concurrent check-ins do not double-process it. Students can review no-shows in Queue History and Notifications.

To enable the scheduled job in Firebase:

1. Deploy the Firestore index and Cloud Function to the configured project:

   ```bash
   npm install --prefix functions
   npx firebase-tools deploy --only firestore:indexes,functions --project queueless-3e183
   ```
   The Firebase deploy hook builds the TypeScript function before upload.
2. Scheduled Functions require the Blaze (pay-as-you-go) plan and the Cloud Scheduler API. Confirm billing and API enablement in Google Cloud before deployment.
3. Verify `expireMissedAppointments` and its scheduler job in the Firebase/Google Cloud console.

The scheduled cleanup runs only after deployment; the client app does not have permission to mark appointments as no-show.

## QR ticket flow

### What the QR contains

`createAppointmentQrPayload(appointmentId)` produces this plain-text value:

```text
queueless:appointment:<appointmentId>
```

The QR does **not** contain a student's name, email, service details, authentication credentials, or a signed/secret token. It is an identifier for locating an appointment. A QR code by itself does not authorize access or mark a student as arrived.

### Student side

`AppointmentQrTicket` in `components.tsx` displays the QR for an appointment only when its status is `approved` and it has not yet been checked in (`arrivedAt` is absent). The ticket is shown on the student home and queue-related screens. The student presents it to the cashier.

### Cashier scan and check-in

1. Staff opens **Active Queue → Scan Student QR**.
2. `cashier-scanner-screen.tsx` requests camera permission through Expo Camera and listens for QR barcodes.
3. `parseAppointmentQrPayload` checks the exact prefix and validates the appointment ID format. Malformed or unrelated QR values are rejected before navigation.
4. A valid scan navigates to `/appointment-details` with the appointment ID and `source=scan`.
5. The details screen listens to staff-visible appointment requests and finds the matching document by ID. It displays the student's name, service, date, and status for cashier verification.
6. The **Confirm Student Arrived** action is shown only when the appointment is approved, scheduled for today, and not already checked in. `markAppointmentArrived` rechecks those conditions in a Firestore transaction and writes `arrivedAt`.
7. After check-in, the student is eligible for **Call Next**. The call-next operation independently checks the approved status, arrival timestamp, queue state, and order before setting the request to `serving`.

Scanning is not the same as check-in: scanning opens the details screen; the cashier must explicitly confirm arrival. Future appointments can be looked up, but cannot be checked in until their appointment date. Already-arrived or non-approved appointments cannot be checked in again.

### QR and access-control implications

- Treat the appointment ID as a reference, not as a secret. Do not add personal or sensitive information to the QR payload.
- A student can read only their own appointment documents; verified staff can read appointment requests needed for staff workflows. These rules are in `firestore.rules`.
- The staff details screen resolves the ID through its Firestore subscription, so an unknown ID does not reveal a document to an unauthorized user.
- Check-in, approval, and queue transitions must continue to be validated by Firestore rules and transactional operation code. Do not make scanning itself perform a privileged write.

### QR implementation and tests

- Payload creation/parsing: `src/features/queueless/appointment-qr.ts`
- Student QR rendering: `AppointmentQrTicket` in `src/features/queueless/components.tsx`
- Staff camera scanner: `src/features/queueless/screens/staff/cashier-scanner-screen.tsx`
- Scan result and arrival confirmation: `AppointmentDetailsScreen` in `src/features/queueless/screens/staff/flows.tsx`
- Check-in and call-next operations: `markAppointmentArrived` and `callNextAppointment` in `src/features/queueless/appointment-requests.ts`
- Payload format tests: `src/features/queueless/__tests__/appointment-qr.test.ts`

When changing the QR format, update both the encoder and parser tests. The scanner should remain tolerant only of the documented payload format; do not accept arbitrary URLs or raw document IDs.

## Firestore data model

| Collection/document | Purpose |
|---|---|
| `users/{uid}` | Student or approved staff profile and role |
| `staffApplications/{uid}` | Staff access request and review status |
| `appointments/{appointmentId}` | Appointment details, queue assignment, arrival, and service lifecycle |
| `appointmentCapacity/{date}` | Booking count/capacity tracking for a date |
| `appointmentQueues/{date}` | Per-date queue state, including current serving appointment |
| `settings/operatingHours` | Open weekdays, hours, default service duration, and closed dates |
| `settings/queueCapacity` | Configured daily booking limit |
| `serviceAvailability/{serviceId}` | Whether a service is available to students |

All client writes are subject to Firestore rules. Keep rule changes in `firestore.rules`, deploy them to the configured Firebase project, and test both allowed and denied operations when changing a flow.

## Local development and checks

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in the Firebase web-app configuration values.
3. Ensure Firebase Authentication Email/Password and Cloud Firestore are configured, and publish the rules from `firestore.rules`.
4. Start the app with `npx expo start`.
5. Run checks with:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

For camera testing, use a device or development build with camera permission enabled. The QR payload unit tests can run without camera hardware.
