import { router, useLocalSearchParams } from 'expo-router';
import { AtSign, Check, Hash, MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppScreen,
  AppointmentQrTicket,
  AppointmentQueueSummary,
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  Header,
} from '../../components';
import {
  getAuthErrorMessage,
  registerStudent,
  resendVerificationEmail,
} from '../../auth/auth';
import {
  cancelAppointmentRequest,
  rescheduleAppointmentRequest,
  submitAppointmentRequest,
} from '../../appointments/appointment-requests';
import { formatLocalDate } from '../../schedule/schedule-utils';
import { services } from '../../data';
import { useQueuelessStyles } from '../../styles';
import { useQueuelessPalette } from '../../palette';
import { useStudentAppointments } from '../../appointments/hooks/use-student-appointments';

export function RegisterScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const [verificationNotice, setVerificationNotice] = useState<string>();
  const emailError = submitted
    ? !email.trim()
      ? 'Student email is required.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? 'Enter a valid student email.'
        : undefined
    : undefined;
  const studentNumberError = submitted && !studentNumber.trim() ? 'Student number is required.' : undefined;
  const passwordError = submitted && !password ? 'Password is required.' : undefined;
  const displayNameError = submitted && !displayName.trim() ? 'Your name is required.' : undefined;
  const canSubmit = Boolean(
    displayName.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      studentNumber.trim() &&
      acceptedTerms &&
      password,
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title={verificationSent ? 'Verify your email' : 'Create Account'}
          subtitle={verificationSent ? 'One last step to secure your account' : 'Register your student profile'}
          backTo="/login"
        />
        {verificationSent ? (
          <View style={styles.verificationScreen}>
            <View style={styles.verificationHero}>
              <View style={styles.verificationIcon}>
                <MailCheck size={36} color={palette.greenDark} strokeWidth={1.8} />
              </View>
              <Text style={styles.verificationTitle}>Check your inbox</Text>
              <Text style={styles.verificationSubtitle}>
                Your account is almost ready. Verify your email to securely sign in to QueueLess.
              </Text>
            </View>
            <View style={styles.verificationEmail}>
              <View style={styles.verificationEmailIcon}>
                <AtSign size={18} color={palette.greenDark} />
              </View>
              <View style={styles.verificationEmailCopy}>
                <Text style={styles.verificationHint}>Verification link sent to</Text>
                <Text style={styles.verificationAddress}>{email.trim()}</Text>
              </View>
            </View>
            <View style={styles.verificationSteps}>
              <View style={styles.verificationStep}>
                <View style={styles.verificationStepIcon}>
                  <Check size={15} color={palette.greenDark} strokeWidth={3} />
                </View>
                <Text style={styles.verificationStepText}>Create your student account</Text>
              </View>
              <View style={styles.verificationStep}>
                <View style={styles.verificationStepNumber}>
                  <Text style={styles.verificationStepNumberText}>2</Text>
                </View>
                <Text style={styles.verificationStepText}>Tap the link in your email</Text>
              </View>
              <View style={styles.verificationStep}>
                <View style={styles.verificationStepNumber}>
                  <Text style={styles.verificationStepNumberText}>3</Text>
                </View>
                <Text style={styles.verificationStepText}>Come back here and sign in</Text>
              </View>
            </View>
            {authError ? <ErrorBanner message={authError} /> : null}
            {verificationNotice ? (
              <Text style={styles.verificationNotice}>{verificationNotice}</Text>
            ) : null}
            <Pressable
              style={styles.primaryButton}
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
                      ? 'Your email is already verified. You can sign in now.'
                      : 'A new verification link has been sent. Check your inbox and spam folder.',
                  );
                } catch (error) {
                  setAuthError(getAuthErrorMessage(error, 'register'));
                } finally {
                  setIsLoading(false);
                }
              }}>
              {isLoading ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Resend verification link</Text>
              )}
            </Pressable>
            <Pressable style={styles.verificationLoginButton} onPress={() => router.replace('/login')}>
              <Text style={styles.verificationLoginText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {authError ? <ErrorBanner message={authError} /> : null}
            <Field label="Full Name" value={displayName} onChangeText={setDisplayName} error={displayNameError} placeholder="Enter your name" autoCapitalize="words" />
            <Field label="Student Email" value={email} onChangeText={setEmail} error={emailError} icon={AtSign} placeholder="name@school.edu" keyboardType="email-address" />
            <Field label="Student Number" value={studentNumber} onChangeText={setStudentNumber} error={studentNumberError} icon={Hash} placeholder="e.g. 2026-10458" keyboardType="default" />
            <Field label="Password" value={password} onChangeText={setPassword} error={passwordError} secure placeholder="Create a password" />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              onPress={() => setAcceptedTerms((accepted) => !accepted)}
              style={{
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 6,
              }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: acceptedTerms ? palette.blueAction : palette.neutralBorder,
                  backgroundColor: acceptedTerms ? palette.blueAction : palette.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {acceptedTerms ? <Check size={16} color={palette.white} strokeWidth={3} /> : null}
              </View>
              <Text style={[styles.itemSubtle, { flex: 1, fontSize: 14 }]}>
                I agree to the Terms & Conditions.
              </Text>
            </Pressable>
            {submitted && !acceptedTerms ? (
              <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '700' }}>
                You must accept the Terms & Conditions to create an account.
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/terms')}
              style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Text style={{ color: palette.greenDark, fontSize: 14, fontWeight: '800' }}>
                Read Terms & Conditions
              </Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonMuted]}
              accessibilityRole="button"
              disabled={isLoading}
              onPress={async () => {
                setSubmitted(true);
                setAuthError(undefined);
                if (!canSubmit || isLoading) return;

                setIsLoading(true);
                try {
                  await registerStudent(
                    displayName,
                    email,
                    password,
                    studentNumber,
                    acceptedTerms,
                  );
                  setVerificationSent(true);
                } catch (error) {
                  setAuthError(getAuthErrorMessage(error, 'register'));
                } finally {
                  setIsLoading(false);
                }
              }}>
              {isLoading ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ServiceDetailsScreen() {
  const styles = useQueuelessStyles();

  const { serviceTitle } = useLocalSearchParams<{ serviceTitle?: string }>();
  const service = services.find((item) => item.title === serviceTitle);

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title={service?.title ?? 'Service unavailable'} subtitle="Cashier service details" backTo="/services" />
        {service ? (
          <>
            <View style={styles.card}>
              <Badge label="Cashier service" tone="green" />
              <Text style={styles.cardTitle}>Main Campus Cashier</Text>
              <Text style={styles.cardSubtle}>{service.body}</Text>
              <View style={styles.cardRule} />
              <Text style={styles.itemSubtle}>Bring your student ID and any documents related to this service.</Text>
            </View>
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push({ pathname: '/schedule', params: { serviceTitle: service.title } })
              }>
              <Text style={styles.primaryButtonText}>Choose Schedule</Text>
            </Pressable>
          </>
        ) : (
          <ErrorBanner message="This service could not be found. Return to the service list and choose another." />
        )}
      </ScrollView>
    </AppScreen>
  );
}

export function AppointmentRequestScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const { date, requestId, serviceTitle } = useLocalSearchParams<{
    date?: string;
    requestId?: string;
    serviceTitle?: string;
  }>();
  const service = services.find((item) => item.title === serviceTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>();
  const parsedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : null;
  const dateIsValid =
    parsedDate !== null &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.getFullYear() === Number(date?.slice(0, 4)) &&
    parsedDate.getMonth() + 1 === Number(date?.slice(5, 7)) &&
    parsedDate.getDate() === Number(date?.slice(8, 10));

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title={requestId ? 'Reschedule Appointment' : 'Queue Request'}
          subtitle={
            requestId
              ? 'Review your new appointment date before confirming'
              : 'Review your queue date before submitting'
          }
          backTo={requestId ? '/my-appointments' : '/schedule'}
        />
        {!service || !dateIsValid ? (
          <ErrorBanner message="Choose a service and date before submitting this queue request." />
        ) : null}
        {submissionError ? <ErrorBanner message={submissionError} /> : null}
        {[
          ['Service', service?.title ?? 'Choose a service'],
          [
            'Date',
            dateIsValid && parsedDate
              ? parsedDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Choose a date',
          ],
          ['Cashier', 'Main Campus Cashier'],
        ].map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <Text style={styles.itemSubtle}>{label}</Text>
            <Text style={styles.itemTitle}>{value}</Text>
          </View>
        ))}
        <Pressable
          style={[styles.primaryButton, (!service || !dateIsValid) && styles.primaryButtonMuted]}
          disabled={!service || !dateIsValid || isSubmitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: !service || !dateIsValid || isSubmitting }}
          onPress={async () => {
            if (!service || !dateIsValid || isSubmitting) {
              return;
            }

            setSubmissionError(undefined);
            setIsSubmitting(true);
            try {
              const ticket = requestId
                ? await rescheduleAppointmentRequest(requestId, String(date))
                : await submitAppointmentRequest({ service: service.title, date: String(date) });

              router.push({ pathname: '/appointment-confirmation', params: { ticket } });
            } catch (error) {
              setSubmissionError(
                error instanceof Error
                  ? error.message
                  : 'Could not submit your appointment request. Please try again.',
              );
            } finally {
              setIsSubmitting(false);
            }
          }}>
          {isSubmitting ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {requestId ? 'Confirm Reschedule' : 'Submit Request'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

export function AppointmentConfirmationScreen() {
  const styles = useQueuelessStyles();

  const { ticket } = useLocalSearchParams<{ ticket?: string }>();
  const { requests, isLoading, error } = useStudentAppointments();
  const request = requests.find((item) => item.id === ticket);

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.confirmationContent} showsVerticalScrollIndicator={false}>
        <View style={styles.confirmationHeader}>
          <View style={[styles.largeAvatar, styles.confirmationAvatar]}>
            <Text style={styles.largeAvatarText}>OK</Text>
          </View>
          <Text style={[styles.h1, styles.confirmationTitle]}>{request?.status === 'serving'
            ? 'You are being served!'
            : request?.status === 'approved'
            ? 'Appointment approved!'
            : ticket
              ? 'Appointment requested successfully!'
              : 'Appointment request not found'}</Text>
          <Text style={styles.confirmationDescription}>
            {request?.status === 'serving'
              ? 'The cashier is serving your appointment now.'
              : request?.status === 'approved'
              ? 'The cashier approved your queue request. Your queue details are ready below.'
              : ticket
                ? `Your request has been sent to the cashier for review. Appointment ID: ${ticket}.`
                : 'Please submit your appointment request again.'}
          </Text>
          {request?.status === 'approved' || request?.status === 'serving' ? (
            <>
              <AppointmentQueueSummary request={request} />
              <AppointmentQrTicket request={request} />
            </>
          ) : ticket ? (
            <View style={styles.confirmationStatusCard}>
              <Text style={styles.itemSubtle}>Status</Text>
              <Text style={styles.confirmationStatusValue}>
                {isLoading ? 'Checking status…' : request?.status === 'rejected' ? 'Request declined' : 'Pending review'}
              </Text>
            </View>
          ) : null}
          {error ? <ErrorBanner message={error} /> : null}
        </View>
        <View style={[styles.buttonStack, styles.confirmationButtonStack]}>
          {request?.status === 'approved' || request?.status === 'serving' ? (
            <Pressable style={[styles.primaryButton, styles.confirmationButton]} onPress={() => router.replace('/queue')}>
              <Text style={styles.primaryButtonText}>Continue to Queue</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[
              request?.status === 'approved' ? styles.secondaryButton : styles.primaryButton,
              styles.confirmationButton,
            ]}
            onPress={() => router.replace('/home')}>
            <Text
              style={
                request?.status === 'approved'
                  ? styles.secondaryButtonText
                  : styles.primaryButtonText
              }>
              Back to Home
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export function AppointmentStatusScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const { requests, isLoading, error: loadError } = useStudentAppointments();
  const hasApprovedRequest = requests.some((request) => request.status === 'approved');

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Appointment Status" subtitle="Latest request update" backTo="/home" />
        {loadError ? <ErrorBanner message={loadError} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {requests.length ? (
          requests.map((request) => (
            <View key={request.id} style={styles.appointmentStatusCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{request.service}</Text>
                <Badge
                  label={request.status[0].toUpperCase() + request.status.slice(1)}
                  tone={request.status === 'approved' ? 'green' : 'warm'}
                />
              </View>
              <Text style={styles.itemSubtle}>Appointment ID: {request.id}</Text>
              <Text style={styles.itemSubtle}>
                {request.date}
              </Text>
              {request.status === 'approved' ? (
                <>
                  <AppointmentQueueSummary request={request} />
                  <AppointmentQrTicket request={request} />
                </>
              ) : null}
            </View>
          ))
        ) : !isLoading && !loadError ? (
          <EmptyState title="No appointment requests" message="When you submit a request, its status will appear here." />
        ) : null}
        {hasApprovedRequest ? (
          <Pressable style={styles.primaryButton} onPress={() => router.push('/queue')}>
            <Text style={styles.primaryButtonText}>Continue to Queue</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

export function MyAppointmentsScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const { requests, isLoading, error } = useStudentAppointments();
  const [cancelConfirmationId, setCancelConfirmationId] = useState<string>();
  const [processingId, setProcessingId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const today = formatLocalDate(new Date());

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="My Queue Requests" subtitle="Upcoming and recent requests" backTo="/home" />
        {error ? <ErrorBanner message={error} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {requests.map((request) => (
          <View key={request.id} style={styles.appointmentStatusCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{request.service}</Text>
              <Badge
                label={request.status[0].toUpperCase() + request.status.slice(1)}
                tone={['approved', 'serving', 'completed'].includes(request.status) ? 'green' : 'warm'}
              />
            </View>
            <Text style={styles.itemSubtle}>Appointment ID: {request.id}</Text>
            <Text style={styles.itemSubtle}>{request.date}</Text>
            {request.status === 'approved' || request.status === 'serving' ? (
              <>
                <AppointmentQueueSummary request={request} />
                <AppointmentQrTicket request={request} />
              </>
            ) : null}
            {['pending', 'approved'].includes(request.status) &&
            request.date > today &&
            !request.arrivedAt ? (
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.secondaryButton, { flex: 1 }]}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/schedule',
                      params: {
                        serviceTitle: request.service,
                        requestId: request.id,
                        originalDate: request.date,
                      },
                    })
                  }>
                  <Text style={styles.secondaryButtonText}>Reschedule</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, { flex: 1 }]}
                  accessibilityRole="button"
                  onPress={() => {
                    setActionError(undefined);
                    setCancelConfirmationId(request.id);
                  }}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
            {cancelConfirmationId === request.id ? (
              <View style={styles.queueActionHint}>
                <Text style={styles.itemTitle}>Cancel this appointment?</Text>
                <Text style={styles.itemSubtle}>
                  It will be removed from the queue, and its place will be released.
                </Text>
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.primaryButton, { flex: 1 }]}
                    disabled={processingId === request.id}
                    accessibilityRole="button"
                    onPress={async () => {
                      setProcessingId(request.id);
                      setActionError(undefined);
                      try {
                        await cancelAppointmentRequest(request.id);
                        setCancelConfirmationId(undefined);
                      } catch (cancelError) {
                        setActionError(
                          cancelError instanceof Error
                            ? cancelError.message
                            : 'Could not cancel this appointment.',
                        );
                      } finally {
                        setProcessingId(undefined);
                      }
                    }}>
                    {processingId === request.id ? (
                      <ActivityIndicator color={palette.white} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Confirm cancel</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, { flex: 1 }]}
                    disabled={processingId === request.id}
                    accessibilityRole="button"
                    onPress={() => setCancelConfirmationId(undefined)}>
                    <Text style={styles.secondaryButtonText}>Keep appointment</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))}
        {!isLoading && !error && !requests.length ? (
          <EmptyState title="No appointments yet" message="Your upcoming and past appointments will appear here." />
        ) : null}
        <View style={styles.buttonStack}>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/services')}>
            <Text style={styles.primaryButtonText}>Book an Appointment</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/home')}>
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export function QueueHistoryScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const { requests, isLoading, error } = useStudentAppointments();
  const history = requests.filter(
    (request) =>
      request.status === 'completed' ||
      request.status === 'skipped' ||
      request.status === 'no-show',
  );

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Queue History" subtitle="Past visits and missed appointments" backTo="/profile" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {history.map((request) => (
          <View key={request.id} style={styles.compactCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{request.service}</Text>
              <Badge
                label={request.status[0].toUpperCase() + request.status.slice(1)}
                tone={request.status === 'completed' ? 'green' : 'warm'}
              />
            </View>
            <Text style={styles.itemSubtle}>
              {request.date}
            </Text>
            <Text style={styles.itemSubtle}>
              {request.queueNumber
                ? `Queue Q-${String(request.queueNumber).padStart(3, '0')}`
                : `Appointment ID: ${request.id}`}
            </Text>
          </View>
        ))}
        {!isLoading && !error && !history.length ? (
          <EmptyState
            title="No queue history"
            message="Completed visits and missed appointments will appear here."
          />
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

export function NotificationsScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const { requests, isLoading, error } = useStudentAppointments();
  const notificationRequests = requests.filter((request) => request.status !== 'pending');
  const today = formatLocalDate(new Date());

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Notifications" subtitle="Queue and appointment alerts" backTo="/home" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {notificationRequests.length ? (
          notificationRequests.map((request) => (
            <View key={request.id} style={styles.appointmentStatusCard}>
              <Text style={styles.itemTitle}>
                {request.status === 'rejected'
                  ? 'Appointment not approved'
                  : request.status === 'cancelled'
                    ? 'Appointment cancelled'
                    : request.status === 'no-show'
                      ? 'Appointment marked as no-show'
                  : request.status === 'completed'
                    ? 'Cashier visit completed'
                    : request.status === 'skipped'
                      ? 'Appointment skipped'
                      : request.status === 'serving'
                          ? 'You’re up!'
                          : request.status === 'approved' &&
                              request.date === today &&
                              request.nextAt
                            ? 'You’re next!'
                          : 'Appointment approved'}
              </Text>
              <Text style={styles.itemSubtle}>
                {request.service} · {request.date}
              </Text>
              {request.status === 'serving' ? (
                <Text style={styles.itemSubtle}>
                    The cashier is ready to serve you now.
                </Text>
              ) : request.status === 'approved' &&
                request.date === today &&
                request.nextAt ? (
                <Text style={styles.itemSubtle}>
                    Please stay near the cashier. You are next in today’s queue.
                </Text>
              ) : request.status === 'approved' ? (
                <Text style={styles.itemSubtle}>
                    Your appointment has been approved. Check your queue position below.
                </Text>
              ) : request.status === 'no-show' ? (
                <Text style={styles.itemSubtle}>
                  Your appointment was not checked in by its scheduled date. You can book another
                  appointment now.
                </Text>
              ) : null}
              {request.status === 'approved' || request.status === 'serving' ? (
                <>
                  <>
                    <AppointmentQueueSummary request={request} />
                    <AppointmentQrTicket request={request} />
                  </>
                  <Pressable style={styles.primaryButton} onPress={() => router.push('/queue')}>
                    <Text style={styles.primaryButtonText}>View Queue</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ))
        ) : !isLoading && !error ? (
          <EmptyState title="No notifications" message="Appointment approvals and queue updates will appear here." />
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}
