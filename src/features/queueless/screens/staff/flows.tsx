import { router, useLocalSearchParams } from 'expo-router';
import { AtSign, BriefcaseBusiness, MailCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, EmptyState, ErrorBanner, Field, StaffHeader, StaffScreen } from '../../components';
import {
  EmailVerificationRequiredError,
  getAuthErrorMessage,
  registerStaffApplication,
  resendVerificationEmail,
  signInForRole,
  signOutCurrentUser,
  verifyStaffApplication,
} from '../../auth';
import {
  callNextAppointment,
  finishAppointment,
  getQueueCapacity,
  initializeAppointmentCapacity,
  markAppointmentArrived,
  reviewAppointmentRequest,
  returnSkippedAppointmentToQueue,
  saveQueueCapacity,
  skipServingAppointment,
  subscribeToAppointmentRequests,
  subscribeToStaffMembers,
  type AppointmentRequest,
  type StaffMember,
} from '../../appointment-requests';
import { services } from '../../data';
import {
  defaultOperatingHours,
  formatLocalDate,
  formatTimeForDisplay,
  getCalendarDates,
  getOperatingHours,
  getServiceAvailability,
  parseTimeFromDisplay,
  parseTimeToMinutes,
  saveOperatingHours,
  setServiceAvailability,
  type OperatingHours,
} from '../../settings';
import { styles } from '../../styles';
import { palette } from '../../palette';
import { getFirebaseAuth } from '@/lib/firebase';
import { useStaffAppointments } from '../../use-staff-appointments';

export function StaffLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string>();
  const emailError = submitted
    ? !email.trim()
      ? 'Email is required.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? 'Enter a valid staff email.'
        : undefined
    : undefined;
  const passwordError = submitted && !password ? 'Password is required.' : undefined;
  const canSubmit = Boolean(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.authContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.loginHero}>
          <View style={styles.schoolShield}>
            <Text style={styles.schoolShieldText}>SU</Text>
          </View>
          <Text style={styles.schoolName}>Cashier Portal</Text>
          <Text style={styles.mutedCenter}>Authorized staff and administrator access</Text>
        </View>
        <View style={styles.form}>
          {authError ? <ErrorBanner message={authError} /> : null}
          <Field
            label="Staff Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            icon={AtSign}
            placeholder="name@school.edu"
            keyboardType="email-address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secure
            placeholder="Enter your password"
          />
          <Pressable
            style={styles.forgotPasswordLink}
            onPress={() =>
              router.push({ pathname: '/forgot-password', params: { email, role: 'staff' } })
            }
            accessibilityRole="link">
            <Text style={styles.linkText}>Forgot password?</Text>
          </Pressable>
        </View>
        <View style={styles.loginActions}>
          <Pressable
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonMuted]}
            accessibilityRole="button"
            disabled={isLoading}
            onPress={async () => {
              setSubmitted(true);
              setAuthError(undefined);
              setVerificationNotice(undefined);
              setRequiresEmailVerification(false);
              if (!canSubmit || isLoading) return;

              setIsLoading(true);
              try {
                await signInForRole(email, password, 'staff');
                router.replace('/cashier-dashboard');
              } catch (error) {
                setAuthError(getAuthErrorMessage(error, 'login'));
                setRequiresEmailVerification(error instanceof EmailVerificationRequiredError);
              } finally {
                setIsLoading(false);
              }
            }}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Log In</Text>
            )}
          </Pressable>
          {requiresEmailVerification ? (
            <Pressable
              style={styles.roleSwitchButton}
              disabled={isLoading}
              accessibilityRole="button"
              onPress={async () => {
                setAuthError(undefined);
                setVerificationNotice(undefined);
                setIsLoading(true);
                try {
                  const alreadyVerified = await resendVerificationEmail(email, password);
                  setVerificationNotice(
                    alreadyVerified
                      ? 'Your email is already verified. You can log in now.'
                      : 'Verification link sent. Check your inbox and spam folder.',
                  );
                  setRequiresEmailVerification(false);
                } catch (error) {
                  setAuthError(getAuthErrorMessage(error, 'login'));
                } finally {
                  setIsLoading(false);
                }
              }}>
              <Text style={styles.roleSwitchText}>Resend verification email</Text>
            </Pressable>
          ) : null}
          {verificationNotice ? <Text style={styles.cardSubtle}>{verificationNotice}</Text> : null}
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/staff-register')}
            accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>Apply for Staff Access</Text>
          </Pressable>
          <Pressable
            style={styles.roleSwitchButton}
            onPress={() => router.push('/admin')}
            accessibilityRole="button">
            <Text style={styles.roleSwitchText}>Administrator portal</Text>
          </Pressable>
          <Pressable
            style={styles.roleSwitchButton}
            onPress={() => router.replace('/choose-role')}>
            <Text style={styles.roleSwitchText}>Choose another account type</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function StaffSignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const [verificationNotice, setVerificationNotice] = useState<string>();

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameError = submitted && !displayName.trim() ? 'Your name is required.' : undefined;
  const emailError = submitted
    ? !email.trim()
      ? 'Email is required.'
      : !validEmail
        ? 'Enter a valid email address.'
        : undefined
    : undefined;
  const passwordError =
    submitted && password.length < 6 ? 'Password must be at least 6 characters.' : undefined;
  const canSubmit = Boolean(displayName.trim() && validEmail && password.length >= 6);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.authContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.loginHero}>
          <View style={styles.schoolShield}>
            {applicationSubmitted ? (
              <MailCheck size={31} color="#FFFFFF" />
            ) : (
              <BriefcaseBusiness size={28} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.schoolName}>
            {emailVerified
              ? 'Application Submitted'
              : applicationSubmitted
                ? 'Verify your email'
                : 'Staff Sign Up'}
          </Text>
          <Text style={styles.mutedCenter}>
            {emailVerified
              ? 'Your email is verified. An administrator will review your staff access request.'
              : applicationSubmitted
                ? `Open the verification link sent to ${email.trim()}, then return here and confirm your email.`
              : 'Create an account and request staff access.'}
          </Text>
        </View>

        {emailVerified ? (
          <View style={styles.staffApplicationNotice}>
            <Text style={styles.staffApplicationNoticeTitle}>Email verified · Approval pending</Text>
            <Text style={styles.staffApplicationNoticeText}>
              Your application is now available to the administrator. You will be able to sign in
              after staff access is approved.
            </Text>
          </View>
        ) : applicationSubmitted ? (
          <View style={styles.form}>
            {authError ? <ErrorBanner message={authError} /> : null}
            {verificationNotice ? (
              <Text style={styles.verificationNotice}>{verificationNotice}</Text>
            ) : null}
            <View style={styles.staffApplicationNotice}>
              <Text style={styles.staffApplicationNoticeTitle}>Verify before review</Text>
              <Text style={styles.staffApplicationNoticeText}>
                The admin portal will not show your application until you verify this email address.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            {authError ? <ErrorBanner message={authError} /> : null}
            <Field
              label="Full Name"
              value={displayName}
              onChangeText={setDisplayName}
              error={nameError}
              icon={BriefcaseBusiness}
              placeholder="Enter your name"
              autoCapitalize="words"
            />
            <Field
              label="Work Email"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              icon={AtSign}
              placeholder="name@school.edu"
              keyboardType="email-address"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              secure
              placeholder="Create a password"
            />
          </View>
        )}

        <View style={styles.loginActions}>
          {emailVerified ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace('/staff-login')}
              accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Back to Staff Sign In</Text>
            </Pressable>
          ) : applicationSubmitted ? (
            <>
              <Pressable
                style={styles.primaryButton}
                disabled={isLoading}
                accessibilityRole="button"
                onPress={async () => {
                  setAuthError(undefined);
                  setVerificationNotice(undefined);
                  if (isLoading) return;

                  setIsLoading(true);
                  try {
                    await verifyStaffApplication(email, password);
                    setEmailVerified(true);
                  } catch (error) {
                    setAuthError(
                      error instanceof EmailVerificationRequiredError
                        ? 'Email is not verified yet. Open the link in your inbox, then try again.'
                        : getAuthErrorMessage(error, 'register'),
                    );
                  } finally {
                    setIsLoading(false);
                  }
                }}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>I Verified My Email</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.roleSwitchButton}
                disabled={isLoading}
                accessibilityRole="button"
                onPress={async () => {
                  setAuthError(undefined);
                  setVerificationNotice(undefined);
                  if (isLoading) return;

                  setIsLoading(true);
                  try {
                    const alreadyVerified = await resendVerificationEmail(email, password);
                    setVerificationNotice(
                      alreadyVerified
                        ? 'Your email is already verified. Tap “I Verified My Email” to submit it for review.'
                        : 'A new verification link has been sent. Check your inbox and spam folder.',
                    );
                  } catch (error) {
                    setAuthError(getAuthErrorMessage(error, 'register'));
                  } finally {
                    setIsLoading(false);
                  }
                }}>
                <Text style={styles.roleSwitchText}>Resend verification link</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonMuted]}
              disabled={isLoading}
              accessibilityRole="button"
              onPress={async () => {
                setSubmitted(true);
                setAuthError(undefined);
                if (!canSubmit || isLoading) return;

                setIsLoading(true);
                try {
                  await registerStaffApplication(displayName, email, password);
                  setApplicationSubmitted(true);
                } catch (error) {
                  setAuthError(getAuthErrorMessage(error, 'register'));
                } finally {
                  setIsLoading(false);
                }
              }}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account & Apply</Text>
              )}
            </Pressable>
          )}
          <Pressable
            style={styles.roleSwitchButton}
            onPress={() => router.replace('/staff-login')}
            accessibilityRole="button">
            <Text style={styles.roleSwitchText}>Already have an account? Staff sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function CashierDashboardScreen() {
  const { requests, isLoading, error } = useStaffAppointments();
  const [capacityInitError, setCapacityInitError] = useState<string>();
  useEffect(() => {
    if (!isLoading) {
      initializeAppointmentCapacity(requests).catch((failure: unknown) => {
        setCapacityInitError(
          failure instanceof Error
            ? failure.message
            : 'Could not initialize daily appointment counts.',
        );
      });
    }
  }, [isLoading, requests]);
  const today = formatLocalDate(new Date());
  const todaysRequests = requests.filter((request) => request.date === today);
  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const nowServing = todaysRequests.find((request) => request.status === 'serving');
  const servedToday = todaysRequests.filter((request) => request.status === 'completed');
  const waitDurations = servedToday.flatMap((request) =>
    request.calledAt && request.arrivedAt
      ? [Math.max(0, request.calledAt.getTime() - request.arrivedAt.getTime())]
      : [],
  );
  const averageWaitMinutes = waitDurations.length
    ? Math.round(
        waitDurations.reduce((total, wait) => total + wait, 0) /
          waitDurations.length /
          60_000,
      )
    : null;

  return (
    <StaffScreen current="dashboard">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Cashier Dashboard" subtitle="Today at State University Main Cashier" />
        {error ? <ErrorBanner message={error} /> : null}
        {capacityInitError ? <ErrorBanner message={capacityInitError} /> : null}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Pending Requests</Text>
            <Text style={styles.h1}>{isLoading ? '—' : pendingCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Now Serving</Text>
            <Text style={styles.h1}>
              {nowServing?.queueNumber
                ? `Q-${String(nowServing.queueNumber).padStart(3, '0')}`
                : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Served Today</Text>
            <Text style={styles.h1}>{isLoading ? '—' : servedToday.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Avg Wait</Text>
            <Text style={styles.h1}>
              {averageWaitMinutes === null ? '—' : `${averageWaitMinutes} min`}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Staff Actions</Text>
        {([
          ['Review Requests', '/appointment-requests'],
          ['Manage Active Queue', '/active-queue'],
          ['Update Capacity', '/queue-capacity'],
          ['View Transaction Log', '/transaction-records'],
        ] as const).map(([label, href]) => (
          <Pressable key={label} style={styles.compactCard} onPress={() => router.push(href)}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{label}</Text>
              <Text style={styles.chevron}>{'>'}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </StaffScreen>
  );
}

export function AppointmentRequestsScreen() {
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  useEffect(() => {
    const unsubscribe = subscribeToAppointmentRequests(
      (items) => {
        setRequests(items);
        setIsLoading(false);
        setLoadError(undefined);
      },
      (error) => {
        setLoadError(error.message);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const handleReview = async (requestId: string, status: 'approved' | 'rejected') => {
    setActionError(undefined);
    setProcessingId(requestId);
    try {
      await reviewAppointmentRequest(requestId, status);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not update this appointment request.',
      );
    } finally {
      setProcessingId(undefined);
    }
  };

  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Appointment Requests" subtitle="Review pending student submissions" />
        {loadError ? <ErrorBanner message={loadError} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {requests.length ? (
          requests.map((request) => (
            <View key={request.id} style={styles.compactCard}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/appointment-details',
                    params: { ticket: request.id },
                  })
                }>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.itemTitle}>{request.studentName}</Text>
                    <Text style={styles.itemSubtle}>
                      {request.service} | {request.date}
                    </Text>
                  </View>
                  <Badge
                    label={request.status[0].toUpperCase() + request.status.slice(1)}
                    tone={request.status === 'approved' ? 'green' : 'warm'}
                  />
                </View>
                <Text style={styles.itemSubtle}>Appointment ID: {request.id}</Text>
              </Pressable>
              {request.status === 'pending' ? (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.primaryButton, { flex: 1 }]}
                    disabled={processingId === request.id}
                    accessibilityRole="button"
                    onPress={() => void handleReview(request.id, 'approved')}>
                    {processingId === request.id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Approve</Text>
                    )}
                  </Pressable>
                  {request.status === 'pending' ? (
                    <Pressable
                      style={[styles.secondaryButton, { flex: 1 }]}
                      disabled={processingId === request.id}
                      accessibilityRole="button"
                      onPress={() => void handleReview(request.id, 'rejected')}>
                      <Text style={styles.secondaryButtonText}>Reject</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        ) : !isLoading && !loadError ? (
          <EmptyState title="No appointment requests" message="New student requests will appear here." />
        ) : null}
      </ScrollView>
    </StaffScreen>
  );
}

export function AppointmentDetailsScreen() {
  const { ticket, source } = useLocalSearchParams<{ ticket?: string; source?: string }>();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAppointmentRequests(
      (items) => {
        setRequests(items);
        setIsLoading(false);
        setLoadError(undefined);
      },
      (error) => {
        setLoadError(error.message);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const request = requests.find((item) => item.id === ticket);

  if (!request) {
    return (
      <StaffScreen current="requests">
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <StaffHeader title="Request Details" subtitle="Appointment request" backTo="/appointment-requests" />
          {loadError ? <ErrorBanner message={loadError} /> : null}
          {isLoading ? (
            <ActivityIndicator color={palette.greenDark} />
          ) : (
            <EmptyState title="No request selected" message="Choose a request from the appointment list to view its details." />
          )}
        </ScrollView>
      </StaffScreen>
    );
  }

  const isAppointmentToday = request.date === formatLocalDate(new Date());

  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader
          title="Request Details"
          subtitle={source === 'scan' ? 'Verify the student’s scanned ticket' : 'Appointment request'}
          backTo={source === 'scan' ? '/cashier-scanner' : '/appointment-requests'}
        />
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>{request.studentName}</Text>
            <Badge
              label={request.status[0].toUpperCase() + request.status.slice(1)}
              tone={request.status === 'approved' ? 'green' : 'warm'}
            />
          </View>
          <Text style={styles.itemSubtle}>Appointment ID: {request.id}</Text>
          <Text style={styles.itemSubtle}>{request.service}</Text>
          <Text style={styles.itemSubtle}>{request.date}</Text>
          {request.arrivedAt ? (
            <Text style={styles.verificationNotice}>
              Student checked in at {request.arrivedAt.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>
        {loadError ? <ErrorBanner message={loadError} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {source === 'scan' && request.status === 'approved' && !isAppointmentToday ? (
          <Text style={styles.verificationNotice}>
            Check-in is available on the appointment date ({request.date}). The cashier can call
            this student from Active Queue on that date.
          </Text>
        ) : null}
        {source === 'scan' &&
        request.status === 'approved' &&
        isAppointmentToday &&
        !request.arrivedAt ? (
          <Pressable
            style={styles.primaryButton}
            disabled={isUpdating}
            onPress={async () => {
              setIsUpdating(true);
              setActionError(undefined);
              try {
                await markAppointmentArrived(request.id);
              } catch (error) {
                setActionError(
                  error instanceof Error ? error.message : 'Could not check in this student.',
                );
              } finally {
                setIsUpdating(false);
              }
            }}>
            {isUpdating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm Student Arrived</Text>
            )}
          </Pressable>
        ) : null}
        {source === 'scan' && request.status !== 'approved' ? (
          <ErrorBanner message={`This appointment cannot be checked in because its status is ${request.status}.`} />
        ) : null}
        {request.status === 'pending' ? (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.primaryButton, { flex: 1 }]}
              disabled={isUpdating}
              onPress={async () => {
                setIsUpdating(true);
                setActionError(undefined);
                try {
                  await reviewAppointmentRequest(request.id, 'approved');
                } catch (error) {
                  setActionError(error instanceof Error ? error.message : 'Could not approve request.');
                } finally {
                  setIsUpdating(false);
                }
              }}>
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Approve</Text>
              )}
            </Pressable>
            {request.status === 'pending' ? (
              <Pressable
                style={[styles.secondaryButton, { flex: 1 }]}
                disabled={isUpdating}
                onPress={async () => {
                  setIsUpdating(true);
                  setActionError(undefined);
                  try {
                    await reviewAppointmentRequest(request.id, 'rejected');
                  } catch (error) {
                    setActionError(error instanceof Error ? error.message : 'Could not reject request.');
                  } finally {
                    setIsUpdating(false);
                  }
                }}>
                <Text style={styles.secondaryButtonText}>Reject</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </StaffScreen>
  );
}

export function ActiveQueueScreen() {
  const { requests, isLoading, error } = useStaffAppointments();
  const today = formatLocalDate(new Date());
  const todayRequests = requests
    .filter((request) =>
      request.date === today &&
      ['approved', 'serving', 'skipped'].includes(request.status),
    )
    .sort(
      (first, second) =>
        (first.queueNumber ?? Number.MAX_SAFE_INTEGER) -
          (second.queueNumber ?? Number.MAX_SAFE_INTEGER) ||
        (first.createdAt?.getTime() ?? 0) - (second.createdAt?.getTime() ?? 0),
    );
  const [actionError, setActionError] = useState<string>();
  const [isUpdating, setIsUpdating] = useState(false);
  const serving = todayRequests.find((request) => request.status === 'serving');
  const waiting = todayRequests.filter((request) => request.status === 'approved');
  const checkedInWaiting = waiting.filter((request) => request.arrivedAt);
  const skipped = todayRequests.filter((request) => request.status === 'skipped');
  const nextUpcoming = requests
    .filter((request) => request.date > today && request.status === 'approved')
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        (first.queueNumber ?? Number.MAX_SAFE_INTEGER) -
          (second.queueNumber ?? Number.MAX_SAFE_INTEGER),
    )[0];

  const runQueueAction = async (action: () => Promise<void>) => {
    setIsUpdating(true);
    setActionError(undefined);
    try {
      await action();
    } catch (actionFailure) {
      setActionError(
        actionFailure instanceof Error ? actionFailure.message : 'Could not update the queue.',
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <StaffScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Active Queue" subtitle="Students waiting to be served" />
        {error ? <ErrorBanner message={error} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/cashier-scanner')}
          accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>Scan Student QR</Text>
        </Pressable>
        {serving ? (
          <>
            <View style={styles.queueHero}>
              <Text style={styles.queueLabel}>Now Serving</Text>
              <Text style={styles.queueNumber}>
                Q-{String(serving.queueNumber ?? '—').padStart(3, '0')}
              </Text>
              <Text style={styles.queueSubtle}>{serving.studentName} · {serving.service}</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/now-serving')}>
              <Text style={styles.primaryButtonText}>Open Now Serving</Text>
            </Pressable>
          </>
        ) : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {!isLoading && !error ? (
          <>
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.primaryButton, { flex: 1 }]}
                disabled={isUpdating || checkedInWaiting.length === 0 || Boolean(serving)}
                onPress={() => void runQueueAction(() => callNextAppointment(today))}>
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Call Next</Text>
                )}
              </Pressable>
              {serving && !serving.cashierFinishedAt && !serving.studentFinishedAt ? (
                <Pressable
                  style={[styles.secondaryButton, { flex: 1 }]}
                  disabled={isUpdating}
                  onPress={() => void runQueueAction(() => skipServingAppointment(serving.id))}>
                  <Text style={styles.secondaryButtonText}>Skip</Text>
                </Pressable>
              ) : null}
            </View>
            {serving ? (
              <Text style={styles.queueActionHint}>
                {serving.cashierFinishedAt
                  ? 'Cashier confirmation saved. Waiting for the student to confirm the transaction is finished.'
                  : serving.studentFinishedAt
                    ? 'The student has confirmed. Confirm from the cashier side to finish the transaction.'
                    : 'Complete or skip the current appointment before calling the next student.'}
              </Text>
            ) : waiting.length === 0 ? (
              <Text style={styles.queueActionHint}>
                {nextUpcoming
                  ? `No approved queue requests are scheduled for today. The next queue date is ${nextUpcoming.date}.`
                  : 'No approved queue requests are scheduled for today. Call Next is available when a student is approved for today.'}
              </Text>
            ) : checkedInWaiting.length ? (
              <Text style={styles.queueActionHint}>
                {checkedInWaiting.length === 1
                  ? 'One student is checked in.'
                  : `${checkedInWaiting.length} students are checked in.`}{' '}
                Tap Call Next to start serving the next student; the
                transaction confirmation controls will then appear on both sides.
              </Text>
            ) : waiting.length ? (
              <Text style={styles.queueActionHint}>
                {waiting.length === 1
                  ? 'One student is approved but has not checked in yet.'
                  : `${waiting.length} students are approved but have not checked in yet.`}{' '}
                Scan a student’s QR code to check them in before calling the next student.
              </Text>
            ) : null}
            {serving && !serving.cashierFinishedAt ? (
              <Pressable
                style={styles.primaryButton}
                disabled={isUpdating || Boolean(serving.cashierFinishedAt)}
                onPress={() => void runQueueAction(() => finishAppointment(serving.id))}>
                <Text style={styles.primaryButtonText}>
                  {serving.cashierFinishedAt
                    ? 'Waiting for Student Confirmation'
                    : serving.studentFinishedAt
                      ? 'Confirm & Finish Transaction'
                      : 'Confirm Transaction Finished'}
                </Text>
              </Pressable>
            ) : null}
            {todayRequests.map((request) => (
              <View key={request.id} style={styles.queueRow}>
                <Text style={styles.ticketBox}>
                  {request.queueNumber ? `Q-${String(request.queueNumber).padStart(3, '0')}` : '—'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{request.studentName}</Text>
                  <Text style={styles.itemSubtle}>
                    {request.service} · {request.date}
                    {request.arrivedAt ? ' · Student arrived' : ''}
                  </Text>
                </View>
                <Badge
                  label={request.status[0].toUpperCase() + request.status.slice(1)}
                  tone={request.status === 'serving' ? 'green' : 'warm'}
                />
                {request.status === 'skipped' ? (
                  <Pressable
                    disabled={isUpdating}
                    onPress={() =>
                      void runQueueAction(() => returnSkippedAppointmentToQueue(request.id))
                    }>
                    <Text style={styles.linkText}>Return</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </>
        ) : null}
        {!isLoading && !error && todayRequests.length === 0 ? (
          <EmptyState title="The queue is empty" message="Students will appear here after they join the queue." />
        ) : null}
        {skipped.length ? (
          <Text style={styles.itemSubtle}>
            Skipped appointments remain visible and can be returned to the end of the queue.
          </Text>
        ) : null}
      </ScrollView>
    </StaffScreen>
  );
}

export function NowServingScreen() {
  const { requests, isLoading, error } = useStaffAppointments();
  const serving = requests.find(
    (request) => request.date === formatLocalDate(new Date()) && request.status === 'serving',
  );
  const [actionError, setActionError] = useState<string>();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateServing = async (action: () => Promise<void>) => {
    setIsUpdating(true);
    setActionError(undefined);
    try {
      await action();
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Could not update this appointment.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <StaffScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Now Serving" subtitle="Current cashier transaction" backTo="/active-queue" />
        {error ? <ErrorBanner message={error} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {serving ? (
          <>
            <View style={styles.queueHero}>
              <Text style={styles.queueLabel}>Now Serving</Text>
              <Text style={styles.queueNumber}>
                Q-{String(serving.queueNumber ?? '—').padStart(3, '0')}
              </Text>
              <Text style={styles.queueSubtle}>{serving.studentName}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.itemTitle}>{serving.service}</Text>
              <Text style={styles.itemSubtle}>
                {serving.date}
              </Text>
              <Text style={styles.itemSubtle}>Appointment ID: {serving.id}</Text>
            </View>
            {serving.cashierFinishedAt ? (
              <Text style={styles.queueActionHint}>
                Cashier confirmation saved. Waiting for the student to confirm the transaction is finished.
              </Text>
            ) : serving.studentFinishedAt ? (
              <Text style={styles.queueActionHint}>
                The student has confirmed. Confirm from the cashier side to finish the transaction.
              </Text>
            ) : null}
            <View style={styles.buttonStack}>
              <Pressable
                style={styles.primaryButton}
                disabled={isUpdating || Boolean(serving.cashierFinishedAt)}
                onPress={() => void updateServing(() => finishAppointment(serving.id))}>
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {serving.cashierFinishedAt
                      ? 'Waiting for Student Confirmation'
                      : serving.studentFinishedAt
                        ? 'Confirm & Finish Transaction'
                        : 'Confirm Transaction Finished'}
                  </Text>
                )}
              </Pressable>
              {!serving.cashierFinishedAt && !serving.studentFinishedAt ? (
                <Pressable
                  style={styles.secondaryButton}
                  disabled={isUpdating}
                  onPress={() => void updateServing(() => skipServingAppointment(serving.id))}>
                  <Text style={styles.secondaryButtonText}>Skip Appointment</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : !isLoading && !error ? (
          <EmptyState title="No active ticket" message="Call the next approved appointment from the active queue." />
        ) : null}
      </ScrollView>
    </StaffScreen>
  );
}

export function AppointmentManagementScreen() {
  const { requests, isLoading, error } = useStaffAppointments();

  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Appointments" subtitle="Approved, pending, and completed bookings" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {requests.map((request) => (
          <View key={request.id} style={styles.compactCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{request.studentName}</Text>
              <Badge
                label={request.status[0].toUpperCase() + request.status.slice(1)}
                tone={request.status === 'approved' || request.status === 'completed' ? 'green' : 'warm'}
              />
            </View>
            <Text style={styles.itemSubtle}>
              {request.service} · {request.date}
            </Text>
            {request.queueNumber ? (
              <Text style={styles.itemSubtle}>Queue Q-{String(request.queueNumber).padStart(3, '0')}</Text>
            ) : null}
          </View>
        ))}
        {!isLoading && !error && !requests.length ? (
          <EmptyState title="No appointments" message="Appointment statuses will appear here when requests are received." />
        ) : null}
      </ScrollView>
    </StaffScreen>
  );
}

export function ServiceManagementScreen() {
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingService, setSavingService] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    getServiceAvailability(services.map((service) => service.id))
      .then((result) => {
        if (isMounted) setAvailability(result);
      })
      .catch(() => {
        if (isMounted) setError('Could not load service availability. Check your connection and staff access.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <StaffScreen current="services">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Services" subtitle="Manage availability and booking times" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {services.map((service) => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceIcon}>
              <Text style={styles.serviceIconText}>{service.icon}</Text>
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.itemTitle}>{service.title}</Text>
              <Text style={styles.itemSubtle}>
                {availability[service.id] ? 'Available to students' : 'Hidden from student bookings'}
              </Text>
            </View>
            <Switch
              accessibilityLabel={`${service.title} availability`}
              value={availability[service.id] ?? true}
              disabled={isLoading || savingService === service.id}
              trackColor={{ false: '#CBD5E1', true: palette.green }}
              thumbColor="#FFFFFF"
              onValueChange={async (enabled) => {
                const previous = availability[service.id] ?? true;
                setError(undefined);
                setAvailability((current) => ({ ...current, [service.id]: enabled }));
                setSavingService(service.id);
                try {
                  await setServiceAvailability(service.id, enabled);
                } catch {
                  setAvailability((current) => ({ ...current, [service.id]: previous }));
                  setError(`Could not update ${service.title}. Check your connection and staff access.`);
                } finally {
                  setSavingService(undefined);
                }
              }}
            />
          </View>
        ))}
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/schedule-settings')}>
          <Text style={styles.secondaryButtonText}>Manage schedule</Text>
        </Pressable>
      </ScrollView>
    </StaffScreen>
  );
}

export function ScheduleSettingsScreen() {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [hours, setHours] = useState<OperatingHours>(defaultOperatingHours);
  const [openTimeInput, setOpenTimeInput] = useState('8:00');
  const [openTimePeriod, setOpenTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [closeTimeInput, setCloseTimeInput] = useState('5:00');
  const [closeTimePeriod, setCloseTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [showSavedDialog, setShowSavedDialog] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getOperatingHours()
      .then((result) => {
        if (isMounted) {
          setHours(result);
          const openTime = formatTimeForDisplay(result.openTime).split(' ');
          const closeTime = formatTimeForDisplay(result.closeTime).split(' ');
          setOpenTimeInput(openTime[0]);
          setOpenTimePeriod(openTime[1] === 'PM' ? 'PM' : 'AM');
          setCloseTimeInput(closeTime[0]);
          setCloseTimePeriod(closeTime[1] === 'AM' ? 'AM' : 'PM');
        }
      })
      .catch(() => {
        if (isMounted) setError('Could not load the booking calendar. Check your connection and staff access.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const calendarDates = getCalendarDates(month);
  const parsedOpenTime = parseTimeFromDisplay(`${openTimeInput} ${openTimePeriod}`);
  const parsedCloseTime = parseTimeFromDisplay(`${closeTimeInput} ${closeTimePeriod}`);
  const firstSlot = parsedOpenTime ? parseTimeToMinutes(parsedOpenTime) : undefined;
  const lastSlot = parsedCloseTime ? parseTimeToMinutes(parsedCloseTime) : undefined;
  const invalidHours =
    firstSlot === undefined || lastSlot === undefined || firstSlot >= lastSlot;

  return (
    <StaffScreen current="services">
      <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Schedule" subtitle="Operating hours and availability" backTo="/service-management" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? (
          <ActivityIndicator color={palette.greenDark} />
        ) : (
          <>
            <View style={styles.settingsCard}>
              <Text style={styles.itemTitle}>Open days</Text>
              <Text style={styles.itemSubtle}>Choose the weekdays students can book.</Text>
              <View style={styles.settingsOptionRow}>
                {weekdays.map((day, index) => {
                  const selected = hours.enabledWeekdays.includes(index);
                  return (
                    <Pressable
                      key={day}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() =>
                        setHours((current) => ({
                          ...current,
                          enabledWeekdays: selected
                            ? current.enabledWeekdays.filter((weekday) => weekday !== index)
                            : [...current.enabledWeekdays, index].sort(),
                        }))
                      }
                      style={[styles.settingsDay, selected && styles.settingsDaySelected]}>
                      <Text style={[styles.settingsDayText, selected && styles.settingsDayTextSelected]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.itemTitle}>Operating hours</Text>
              <View style={styles.settingsTimeRow}>
                <View style={styles.settingsTimeField}>
                  <Field
                    label="Opens"
                    value={openTimeInput}
                    onChangeText={setOpenTimeInput}
                    placeholder="8:00"
                  />
                  <View style={styles.settingsPeriodRow}>
                    {(['AM', 'PM'] as const).map((period) => (
                      <Pressable
                        key={period}
                        accessibilityRole="button"
                        accessibilityLabel={`Opening time ${period}`}
                        accessibilityState={{ selected: openTimePeriod === period }}
                        onPress={() => setOpenTimePeriod(period)}
                        style={[
                          styles.settingsPeriodButton,
                          openTimePeriod === period && styles.settingsPeriodButtonSelected,
                        ]}>
                        <Text
                          style={[
                            styles.settingsPeriodText,
                            openTimePeriod === period && styles.settingsPeriodTextSelected,
                          ]}>
                          {period}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.settingsTimeField}>
                  <Field
                    label="Closes"
                    value={closeTimeInput}
                    onChangeText={setCloseTimeInput}
                    placeholder="5:00"
                  />
                  <View style={styles.settingsPeriodRow}>
                    {(['AM', 'PM'] as const).map((period) => (
                      <Pressable
                        key={period}
                        accessibilityRole="button"
                        accessibilityLabel={`Closing time ${period}`}
                        accessibilityState={{ selected: closeTimePeriod === period }}
                        onPress={() => setCloseTimePeriod(period)}
                        style={[
                          styles.settingsPeriodButton,
                          closeTimePeriod === period && styles.settingsPeriodButtonSelected,
                        ]}>
                        <Text
                          style={[
                            styles.settingsPeriodText,
                            closeTimePeriod === period && styles.settingsPeriodTextSelected,
                          ]}>
                          {period}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              {invalidHours ? (
                <Text style={styles.settingsValidation}>
                  Enter times like 8:00 AM or 5:00 PM, and make sure closing is later than opening.
                </Text>
              ) : null}
              <Text style={[styles.itemTitle, { marginTop: 16 }]}>Average service duration</Text>
              <View style={styles.settingsOptionRow}>
                {([15, 30, 60] as const).map((slotMinutes) => {
                  const selected = hours.slotMinutes === slotMinutes;
                  return (
                    <Pressable
                      key={slotMinutes}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setHours((current) => ({ ...current, slotMinutes }))}
                      style={[styles.settingsChip, selected && styles.settingsDaySelected]}>
                      <Text style={[styles.settingsDayText, selected && styles.settingsDayTextSelected]}>
                        {slotMinutes} min
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.settingsCard}>
              <View style={styles.settingsCalendarHeader}>
                <Text style={styles.itemTitle}>Closed dates</Text>
                <View style={styles.settingsMonthControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
                    <Text style={styles.settingsMonthArrow}>{'<'}</Text>
                  </Pressable>
                  <Text style={styles.settingsMonthLabel}>
                    {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
                    <Text style={styles.settingsMonthArrow}>{'>'}</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.itemSubtle}>Tap a future date to mark it closed or reopen it.</Text>
              <View style={styles.settingsCalendarGrid}>
                {weekdays.map((day) => (
                  <Text key={day} style={styles.settingsCalendarWeekday}>{day[0]}</Text>
                ))}
                {calendarDates.map((date) => {
                  const dateKey = formatLocalDate(date);
                  const isCurrentMonth = date.getMonth() === month.getMonth();
                  const isPast = dateKey < formatLocalDate(new Date());
                  const isClosed = hours.closedDates.includes(dateKey);
                  return (
                    <Pressable
                      key={dateKey}
                      accessibilityRole="button"
                      accessibilityLabel={`${date.toLocaleDateString()}, ${isClosed ? 'closed' : 'open'}`}
                      disabled={!isCurrentMonth || isPast}
                      onPress={() =>
                        setHours((current) => ({
                          ...current,
                          closedDates: isClosed
                            ? current.closedDates.filter((closedDate) => closedDate !== dateKey)
                            : [...current.closedDates, dateKey],
                        }))
                      }
                      style={[
                        styles.settingsCalendarDate,
                        !isCurrentMonth && styles.settingsCalendarDateOutside,
                        isClosed && styles.settingsCalendarDateClosed,
                        isPast && styles.settingsCalendarDatePast,
                      ]}>
                      <Text style={[
                        styles.settingsCalendarDateText,
                        !isCurrentMonth && styles.settingsCalendarDateOutsideText,
                        isClosed && styles.settingsCalendarDateClosedText,
                      ]}>{date.getDate()}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.itemSubtle}>
                {hours.closedDates.length} date{hours.closedDates.length === 1 ? '' : 's'} marked closed
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isSaving || invalidHours}
              style={[styles.primaryButton, (isSaving || invalidHours) && styles.primaryButtonMuted]}
              onPress={async () => {
                setIsSaving(true);
                setError(undefined);
                try {
                  if (!parsedOpenTime || !parsedCloseTime) {
                    throw new Error('Enter valid opening and closing times with AM or PM.');
                  }
                  await saveOperatingHours({
                    ...hours,
                    openTime: parsedOpenTime,
                    closeTime: parsedCloseTime,
                  });
                  setHours((current) => ({
                    ...current,
                    openTime: parsedOpenTime,
                    closeTime: parsedCloseTime,
                  }));
                  const savedOpenTime = formatTimeForDisplay(parsedOpenTime).split(' ');
                  const savedCloseTime = formatTimeForDisplay(parsedCloseTime).split(' ');
                  setOpenTimeInput(savedOpenTime[0]);
                  setOpenTimePeriod(savedOpenTime[1] === 'PM' ? 'PM' : 'AM');
                  setCloseTimeInput(savedCloseTime[0]);
                  setCloseTimePeriod(savedCloseTime[1] === 'AM' ? 'AM' : 'PM');
                  setShowSavedDialog(true);
                } catch {
                  setError('Could not save the booking calendar. Check your times, connection, and staff access.');
                } finally {
                  setIsSaving(false);
                }
              }}>
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Save schedule</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
      <Modal
        visible={showSavedDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSavedDialog(false)}>
        <View style={styles.scheduleSavedBackdrop}>
          <View style={styles.scheduleSavedDialog}>
            <View style={styles.scheduleSavedIcon}>
              <Text style={styles.scheduleSavedIconText}>✓</Text>
            </View>
            <Text style={styles.scheduleSavedTitle}>Schedule saved</Text>
            <Text style={styles.itemSubtle}>
              Your booking calendar and operating hours have been updated.
            </Text>
            <Pressable
              style={[styles.primaryButton, styles.scheduleSavedDoneButton]}
              accessibilityRole="button"
              onPress={() => setShowSavedDialog(false)}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </>
    </StaffScreen>
  );
}

export function StaffAccountSettingsScreen() {
  const [account] = useState(() => {
    try {
      const user = getFirebaseAuth().currentUser;
      return user
        ? { email: user.email ?? '', emailVerified: user.emailVerified, error: undefined }
        : { email: '', emailVerified: false, error: 'No staff account is signed in.' };
    } catch {
      return { email: '', emailVerified: false, error: 'Could not load the signed-in account.' };
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(account.error);

  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Account Settings" subtitle="Manage your staff account" />
        {error ? <ErrorBanner message={error} /> : null}
        {!error ? (
          <View style={styles.settingsCard}>
            <Text style={styles.itemTitle}>Signed-in account</Text>
            <Text style={styles.itemSubtle}>{account.email || 'No email available'}</Text>
            <Text style={styles.itemSubtle}>{account.emailVerified ? 'Email verified' : 'Email not verified'}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          style={[styles.secondaryButton, isLoading && styles.primaryButtonMuted]}
          onPress={async () => {
            setError(undefined);
            setIsLoading(true);
            try {
              await signOutCurrentUser();
              router.replace('/staff-login');
            } catch {
              setError('Could not sign out. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }}>
          {isLoading ? (
            <ActivityIndicator color={palette.greenDark} />
          ) : (
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          )}
        </Pressable>
      </ScrollView>
    </StaffScreen>
  );
}

export function QueueCapacityScreen() {
  const { requests, error: appointmentsError } = useStaffAppointments();
  const [dailyLimit, setDailyLimit] = useState('100');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const limitValue = Number(dailyLimit);
  const isValidLimit = Number.isInteger(limitValue) && limitValue >= 1 && limitValue <= 5000;
  const today = formatLocalDate(new Date());
  const bookedToday = requests.filter(
    (request) => request.date === today && request.status !== 'rejected',
  ).length;

  useEffect(() => {
    let isMounted = true;
    getQueueCapacity()
      .then((capacity) => {
        if (isMounted) setDailyLimit(String(capacity.dailyLimit));
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load queue capacity.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Queue Capacity" subtitle="Limit and monitor virtual traffic load" backTo="/service-management" />
        {error ? <ErrorBanner message={error} /> : null}
        {appointmentsError ? <ErrorBanner message={appointmentsError} /> : null}
        {notice ? <Text style={styles.verificationNotice}>{notice}</Text> : null}
        {isLoading ? (
          <ActivityIndicator color={palette.greenDark} />
        ) : (
          <>
            <View style={styles.settingsCard}>
              <Text style={styles.itemTitle}>Daily appointment limit</Text>
              <Text style={styles.itemSubtle}>
                Set how many appointment requests can be booked for one day. Rejected requests free a place.
              </Text>
              <Text style={styles.itemSubtle}>
                Today: {bookedToday} / {limitValue} appointments booked
              </Text>
              <Field
                label="Maximum appointments per day"
                value={dailyLimit}
                onChangeText={setDailyLimit}
                keyboardType="number-pad"
                placeholder="100"
              />
              {!isValidLimit ? (
                <Text style={styles.settingsValidation}>Enter a whole number from 1 to 5,000.</Text>
              ) : null}
            </View>
            <Pressable
              style={[styles.primaryButton, (!isValidLimit || isSaving) && styles.primaryButtonMuted]}
              disabled={!isValidLimit || isSaving}
              onPress={async () => {
                setError(undefined);
                setNotice(undefined);
                setIsSaving(true);
                try {
                  await saveQueueCapacity({ dailyLimit: limitValue });
                  setNotice('Daily appointment limit saved.');
                } catch (saveError) {
                  setError(
                    saveError instanceof Error
                      ? saveError.message
                      : 'Could not save the daily appointment limit.',
                  );
                } finally {
                  setIsSaving(false);
                }
              }}>
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Save capacity</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </StaffScreen>
  );
}

export function StaffManagementScreen() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const unsubscribe = subscribeToStaffMembers(
      (members) => {
        setStaff(members);
        setIsLoading(false);
        setError(undefined);
      },
      (loadError) => {
        setError(loadError.message);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Staff Accounts" subtitle="Manage authorized cashier personnel" backTo="/service-management" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {staff.length ? (
          staff.map((member) => (
            <View key={member.uid} style={styles.queueRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {member.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {member.name}
                </Text>
                <Text style={styles.itemSubtle}>{member.email} · Cashier staff</Text>
              </View>
            </View>
          ))
        ) : !isLoading && !error ? (
          <EmptyState title="No staff accounts" message="Authorized staff accounts will appear here." />
        ) : null}
      </ScrollView>
    </StaffScreen>
  );
}

export function TransactionRecordsScreen() {
  const { requests, isLoading, error } = useStaffAppointments();
  const records = requests
    .filter((request) => request.status === 'completed' || request.status === 'skipped')
    .sort(
      (first, second) =>
        (second.completedAt?.getTime() ?? 0) - (first.completedAt?.getTime() ?? 0),
    );

  return (
    <StaffScreen current="dashboard">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Transaction Log" subtitle="History of campus cashier services" backTo="/cashier-dashboard" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {records.map((request) => (
          <View key={request.id} style={styles.compactCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{request.studentName}</Text>
              <Badge
                label={request.status[0].toUpperCase() + request.status.slice(1)}
                tone={request.status === 'completed' ? 'green' : 'warm'}
              />
            </View>
            <Text style={styles.itemSubtle}>
              {request.service} · {request.date}
            </Text>
            <Text style={styles.itemSubtle}>
              {request.completedAt
                ? `Completed ${request.completedAt.toLocaleString()}`
                : `Appointment ID: ${request.id}`}
            </Text>
          </View>
        ))}
        {!isLoading && !error && !records.length ? (
          <EmptyState title="No transactions yet" message="Completed cashier visits will appear here." />
        ) : null}
      </ScrollView>
    </StaffScreen>
  );
}
