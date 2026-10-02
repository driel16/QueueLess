# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Project layout

- `src/app/` contains Expo Router route entry points.
- `src/features/queueless/screens/auth/` contains splash and sign-in/registration screens.
- `src/features/queueless/screens/student/` contains student-facing screens and booking flows.
- `src/features/queueless/screens/staff/` contains cashier and staff screens.
- `src/features/queueless/components.tsx`, `data.ts`, `palette.ts`, and `styles.ts` hold shared UI, demo data, colors, and styles for the QueueLess feature.
- `src/components/`, `src/hooks/`, and `src/constants/` hold app-wide reusable components, hooks, and theme constants.

## Presentation questions and facts

For a quick app summary, likely demo questions, and presentation-ready talking points, see [APP-FAQ-AND-FACTS.md](./APP-FAQ-AND-FACTS.md).

## Developer documentation

Download the [QueueLess Developer Guide (DOCX)](./docs/DEVELOPER-GUIDE.docx), or read the [Markdown source](./docs/DEVELOPER-GUIDE.md), for the architecture, student/staff workflows, Firestore model, and QR ticket scan/check-in flow.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Quality checks

Run these checks before changes are merged or shipped:

```bash
npm run lint
npm run typecheck
npm test
npx expo-doctor
```

`npm test` exercises the appointment calendar and time-slot utilities. Exporting
the app for iOS and Android checks JavaScript bundling, but does not replace
installing and testing the app on real devices or simulators.

## Device builds and releases

The permanent iOS bundle ID and Android application ID are both set to
`com.driel16.queueless` in `app.json`. Do not change them after publishing the
app. Link the project to the Expo account that owns this application:

```bash
npx eas-cli@latest init
```

Set the Firebase `EXPO_PUBLIC_` configuration values in the selected EAS
environment as well as local `.env` for local development. Those client
configuration values are bundled into the app and must not contain server
credentials.

The `eas.json` profiles support development builds, Android-installable
preview APKs, and production store builds:

```bash
npx eas-cli@latest build --profile development --platform all
npx eas-cli@latest build --profile preview --platform all
npx eas-cli@latest build --profile production --platform all
```

Store signing credentials, store accounts, and testing on actual iOS and
Android devices are separate release steps; bundling alone does not verify them.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Firebase Authentication setup

This project uses the Firebase JavaScript SDK, which works in Expo Go.

1. Register a **Web app** in the `queueless-3e183` Firebase project and copy its full Firebase configuration.
2. Copy `.env.example` to `.env` and fill in the Web app's `apiKey`, `appId`, and other available values. These `EXPO_PUBLIC_` values are included in the app bundle; they are identifiers, not secrets.
3. In Firebase Authentication, enable the Email/Password provider.
4. Create a Cloud Firestore database and publish the rules in `firestore.rules`.
5. Staff can submit an application from the Staff Sign In screen. New applications remain `pending-verification` until the applicant opens the Firebase email verification link and taps **I Verified My Email** in the app. Only then does the application become visible to the admin portal as pending. The admin portal is available from Staff Sign In and is restricted to the verified Firebase Authentication email `azedricmarc@gmail.com`. Ensure that address has a password-based Firebase Auth account and is verified; if it is not already registered, create it through student signup and verify the email first. The admin portal can then approve or reject applications; approval creates `users/{uid}` with the `staff` role. Applicants cannot grant themselves staff access.
6. Student registration sends a Firebase email verification link. Users must open it before signing in. Configure the verification email template in **Authentication → Templates** if needed.
7. Publish the updated Firestore rules after changes. They allow verified `azedricmarc@gmail.com` to read staff applications, approve/reject them, and create staff profiles:
   ```bash
   npx firebase-tools deploy --only firestore:rules --project queueless-3e183
   ```
8. Restart Expo after changing `.env`:

   ```bash
   npx expo start
   ```

Student registration collects a display name and creates a `users/{uid}` profile with the `student` role, email, and student number. The home greeting and profile screen show those saved details and email-verification status. Existing profiles without a display name fall back to the email name. Students can delete their account from the profile screen after re-entering their password and confirming their email address; this deletes the Firebase Authentication user and their `users/{uid}` profile. Publish updated Firestore rules after changes. Staff sign-in is allowed only when the matching profile has the `staff` role.

### Staff service and schedule settings

Verified staff accounts and the verified admin account can manage service availability from the dedicated **Staff → Services** tab. The student service list hides services that staff turn off. The **Manage schedule** screen under Services configures operating weekdays, 24-hour opening and closing times, the average service duration used to estimate queue waits, and specific closed dates. Students choose an available date rather than a reserved time; approved requests are queued in queue-number order. The **Settings** tab is reserved for staff account details and sign-out. Until staff save a schedule, the calendar defaults to weekdays from 08:00 to 17:00 with a 30-minute estimated service duration.

Availability is stored in `serviceAvailability/{serviceId}` documents and `settings/operatingHours`. Verified users can read these settings; only verified staff profiles (`users/{uid}.role == "staff"`) and the verified admin can write them. Publish `firestore.rules` after updating the application:

```bash
npx firebase-tools deploy --only firestore:rules --project queueless-3e183
```
