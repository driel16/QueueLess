import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getIdToken,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import {
  FirebaseConfigurationError,
  getFirebaseAuth,
  getFirebaseFirestore,
} from '@/lib/firebase';

export type AccountRole = 'student' | 'staff';
export const ADMIN_EMAIL = 'azedricmarc@gmail.com';

export type StudentProfile = {
  uid: string;
  displayName: string;
  email: string;
  studentNumber: string;
  emailVerified: boolean;
};

export type StaffApplication = {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date | null;
  status: 'pending-verification' | 'pending' | 'approved' | 'rejected';
};

export class EmailVerificationRequiredError extends Error {
  constructor() {
    super('Verify your email address before signing in. Check your inbox for the verification link.');
    this.name = 'EmailVerificationRequiredError';
  }
}

export class VerificationEmailSendError extends Error {
  constructor() {
    super(
      'Your account was created, but the verification email could not be sent. Sign in and use Resend verification email.',
    );
    this.name = 'VerificationEmailSendError';
  }
}

export class AccountRoleError extends Error {
  constructor(role: AccountRole) {
    super(
      role === 'staff'
        ? 'Your account does not have staff access yet. If you submitted a staff application, wait for an administrator to approve it.'
        : 'This account is not registered as a student.',
    );
    this.name = 'AccountRoleError';
  }
}

export async function registerStudent(
  displayName: string,
  email: string,
  password: string,
  studentNumber: string,
) {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

  try {
    await setDoc(doc(db, 'users', credential.user.uid), {
      email: credential.user.email,
      displayName: displayName.trim(),
      role: 'student',
      studentNumber: studentNumber.trim(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteUser(credential.user);
    throw error;
  }

  try {
    await sendEmailVerification(credential.user);
  } catch {
    await signOut(auth);
    throw new VerificationEmailSendError();
  }

  await signOut(auth);
}

export async function registerStaffApplication(displayName: string, email: string, password: string) {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

  try {
    await setDoc(doc(db, 'staffApplications', credential.user.uid), {
      email: credential.user.email,
      displayName: displayName.trim(),
      status: 'pending-verification',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteUser(credential.user);
    throw error;
  }

  try {
    await sendEmailVerification(credential.user);
  } catch {
    await signOut(auth);
    throw new VerificationEmailSendError();
  }

  await signOut(auth);
}

export async function verifyStaffApplication(email: string, password: string) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

  try {
    await reload(credential.user);
    await getIdToken(credential.user, true);
    if (!credential.user.emailVerified) {
      throw new EmailVerificationRequiredError();
    }

    await updateDoc(doc(getFirebaseFirestore(), 'staffApplications', credential.user.uid), {
      status: 'pending',
    });
  } finally {
    await signOut(auth);
  }
}

export async function signInAsAdmin(email: string, password: string) {
  if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
    throw new Error('This email is not authorized for the admin portal.');
  }

  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  await reload(credential.user);
  await getIdToken(credential.user, true);

  if (
    credential.user.email?.toLowerCase() !== ADMIN_EMAIL ||
    !credential.user.emailVerified
  ) {
    await signOut(auth);
    throw new Error('The admin account must have a verified email address.');
  }
}

async function requireAdmin() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error('Sign in with the authorized admin account to continue.');
  }

  await reload(user);
  await getIdToken(user, true);
  if (!user.emailVerified) {
    throw new Error('The admin account must have a verified email address.');
  }

  return user;
}

export async function getStaffApplications(): Promise<StaffApplication[]> {
  await requireAdmin();
  const snapshot = await getDocs(collection(getFirebaseFirestore(), 'staffApplications'));

  return snapshot.docs
    .map((applicationDoc) => {
      const data = applicationDoc.data();
      const status =
        data.status === 'pending-verification' ||
        data.status === 'approved' ||
        data.status === 'rejected'
          ? data.status
          : 'pending';

      return {
        uid: applicationDoc.id,
        email: typeof data.email === 'string' ? data.email : '',
        displayName: typeof data.displayName === 'string' ? data.displayName : 'Staff applicant',
        createdAt: data.createdAt?.toDate?.() ?? null,
        status,
      };
    })
    .filter((application) => application.status === 'pending')
    .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0));
}

export async function reviewStaffApplication(
  userId: string,
  decision: 'approved' | 'rejected',
) {
  await requireAdmin();
  const db = getFirebaseFirestore();
  const applicationRef = doc(db, 'staffApplications', userId);
  const applicationSnapshot = await getDoc(applicationRef);
  if (!applicationSnapshot.exists()) {
    throw new Error('This staff application no longer exists. Refresh and try again.');
  }

  const application = applicationSnapshot.data();
  if (application.status !== 'pending') {
    throw new Error('This staff application has already been reviewed. Refresh the list.');
  }

  const batch = writeBatch(db);
  if (decision === 'approved') {
    batch.set(
      doc(db, 'users', userId),
      {
        email: application.email,
        displayName: application.displayName,
        role: 'staff',
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  batch.update(applicationRef, { status: decision });
  await batch.commit();
}

export async function getCurrentStudentProfile(): Promise<StudentProfile | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  const profileSnapshot = await getDoc(doc(getFirebaseFirestore(), 'users', user.uid));
  if (!profileSnapshot.exists()) {
    throw new Error('Your account profile could not be found. Please contact support.');
  }

  const profile = profileSnapshot.data();
  const email = user.email ?? '';
  const displayName =
    typeof profile.displayName === 'string' && profile.displayName.trim()
      ? profile.displayName.trim()
      : email.split('@')[0] || 'Student';

  return {
    uid: user.uid,
    displayName,
    email,
    studentNumber: typeof profile.studentNumber === 'string' ? profile.studentNumber : '',
    emailVerified: user.emailVerified,
  };
}

export async function signOutCurrentUser() {
  await signOut(getFirebaseAuth());
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function deleteCurrentStudentAccount(
  confirmationEmail: string,
  password: string,
) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('You must be signed in to delete your account.');
  }

  if (confirmationEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('Enter the email address on your account to confirm deletion.');
  }

  if (!user.emailVerified) {
    throw new Error('Verify your email address before deleting your account.');
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  await reload(user);
  await getIdToken(user, true);

  if (!user.emailVerified) {
    throw new Error('Verify your email address before deleting your account.');
  }

  const profileRef = doc(getFirebaseFirestore(), 'users', user.uid);
  const profileSnapshot = await getDoc(profileRef);
  if (!profileSnapshot.exists()) {
    throw new Error('Your account profile could not be found. Please contact support.');
  }

  const profile = profileSnapshot.data();
  await deleteDoc(profileRef);

  try {
    await deleteUser(user);
  } catch (deleteError) {
    try {
      await setDoc(profileRef, {
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        studentNumber: profile.studentNumber,
        createdAt: serverTimestamp(),
      });
    } catch (restoreError) {
      throw new Error(
        `Account deletion did not complete, and restoring the profile also failed. Contact support. Deletion error: ${deleteError instanceof Error ? deleteError.message : 'unknown error'}. Profile restore error: ${restoreError instanceof Error ? restoreError.message : 'unknown error'}.`,
      );
    }

    throw deleteError;
  }
}

export async function resendVerificationEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

  try {
    await reload(credential.user);
    await getIdToken(credential.user, true);
    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user);
    }
    return credential.user.emailVerified;
  } finally {
    await signOut(auth);
  }
}

export async function signInForRole(
  email: string,
  password: string,
  role: AccountRole,
) {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

  try {
    await reload(credential.user);
    await getIdToken(credential.user, true);
    if (!credential.user.emailVerified) {
      throw new EmailVerificationRequiredError();
    }

    const userProfile = await getDoc(doc(db, 'users', credential.user.uid));
    if (!userProfile.exists() || userProfile.data().role !== role) {
      throw new AccountRoleError(role);
    }
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export function getAuthErrorMessage(error: unknown, action: 'login' | 'register') {
  if (
    error instanceof AccountRoleError ||
    error instanceof EmailVerificationRequiredError ||
    error instanceof VerificationEmailSendError ||
    error instanceof FirebaseConfigurationError
  ) {
    return error.message;
  }

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'The email or password is incorrect.';
      case 'auth/email-already-in-use':
        return 'An account already exists for this email.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/weak-password':
        return 'Choose a stronger password (at least 6 characters).';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait and try again.';
      case 'auth/network-request-failed':
        return 'Could not connect. Check your internet connection and try again.';
      case 'auth/operation-not-allowed':
        return 'Email and password sign-in is not enabled in Firebase Authentication.';
      case 'auth/requires-recent-login':
        return 'Please sign in again before deleting your account.';
      case 'auth/invalid-api-key':
        return 'Firebase configuration is invalid. Check the API key in your local .env file.';
      case 'permission-denied':
        return 'Firebase denied access. Check the deployed Firestore Security Rules.';
      default:
        return action === 'login'
          ? 'Unable to sign in. Please try again.'
          : 'Unable to create your account. Please try again.';
    }
  }

  return action === 'login'
    ? 'Unable to sign in. Please try again.'
    : 'Unable to create your account. Please try again.';
}

export function getPasswordResetErrorMessage(error: unknown) {
  if (error instanceof FirebaseConfigurationError) {
    return error.message;
  }

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many requests. Please wait before trying again.';
      case 'auth/network-request-failed':
        return 'Could not connect. Check your internet connection and try again.';
      case 'auth/operation-not-allowed':
        return 'Password reset is not enabled in Firebase Authentication.';
      case 'auth/invalid-api-key':
        return 'Firebase configuration is invalid. Check the API key in your local .env file.';
      default:
        return 'Could not send a reset email. Please try again.';
    }
  }

  return 'Could not send a reset email. Please try again.';
}
