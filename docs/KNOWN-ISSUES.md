# Known Issues

## Student appointment cancellation is unavailable

- **Area:** Firestore appointment and capacity writes
- **Impact:** Students cannot cancel a pending or approved appointment in the app.
- **Observed:** October 9, 2026, on the web client. Firestore returned `permission-denied` for a multi-document `Commit` while attempting to cancel appointment `gQtqAOXH9Jmq45Y1KMzb`.

### Reason

The cancellation transaction tried to update the appointment to `cancelled`, decrement `appointmentCapacity`, delete the student's active appointment lock, and, for a late cancellation, create a booking incident and update `studentBookingRestrictions`. Firestore evaluates each operation against its security rules and rejects the entire transaction if any write is unauthorized.

The checked-in `firestore.rules` does not authorize a student to change a pending or approved appointment to `cancelled`. Its appointment update rules cover staff actions and student queue completion, but not student cancellation. The capacity release, lock deletion, and late-incident writes also have their own rule checks. The `permission-denied` response for the batch does not identify which individual write failed; the missing student cancellation permission is a confirmed blocker, while the exact failing operation in the reported request was not isolated.

### Current status

Student-facing cancellation actions and the `cancelStudentAppointment` callable have been removed from the source pending a rules-backed fix. Deploy the Functions change to remove the already deployed callable. Existing appointment records with `cancelled` status remain readable and are not deleted.

### Follow-up

Before restoring cancellation, add a narrowly validated server-side or Firestore transaction flow and test all writes together against the Firestore Emulator, including normal and late cancellation cases. Do not resolve this by broadly allowing student writes to these collections.
