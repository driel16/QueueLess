import { router } from 'expo-router';
import { AtSign, BriefcaseBusiness, MailCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
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
import { activeQueue, appointmentRequests, services, staffMembers } from '../../data';
import {
  defaultOperatingHours,
  formatLocalDate,
  getCalendarDates,
  getOperatingHours,
  getServiceAvailability,
  parseTimeToMinutes,
  saveOperatingHours,
  setServiceAvailability,
  type OperatingHours,
} from '../../settings';
import { styles } from '../../styles';
import { palette } from '../../palette';
import { getFirebaseAuth } from '@/lib/firebase';

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
            onPress={() => router.replace('/')}>
            <Text style={styles.roleSwitchText}>Not staff? Choose another account type</Text>
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
  return (
    <StaffScreen current="dashboard">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Cashier Dashboard" subtitle="Today at State University Main Cashier" />
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Pending Requests</Text>
            <Text style={styles.h1}>{appointmentRequests.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Now Serving</Text>
            <Text style={styles.h1}>{activeQueue.find((entry) => entry.status === 'Serving')?.ticket ?? '—'}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Served Today</Text>
            <Text style={styles.h1}>0</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Avg Wait</Text>
            <Text style={styles.h1}>—</Text>
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
  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Appointment Requests" subtitle="Review pending student submissions" />
        {appointmentRequests.length ? (
          appointmentRequests.map((request) => (
            <Pressable key={request.ticket} style={styles.compactCard} onPress={() => router.push('/appointment-details')}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.itemTitle}>{request.name}</Text>
                  <Text style={styles.itemSubtle}>
                    {request.service} | {request.time}
                  </Text>
                </View>
                <Badge label={request.status} tone={request.status === 'Approved' ? 'green' : 'warm'} />
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState title="No appointment requests" message="New student requests will appear here." />
        )}
      </ScrollView>
    </StaffScreen>
  );
}

export function AppointmentDetailsScreen() {
  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Request Details" subtitle="Appointment request" backTo="/appointment-requests" />
        <EmptyState title="No request selected" message="Choose a request from the appointment list to view its details." />
      </ScrollView>
    </StaffScreen>
  );
}

export function ActiveQueueScreen() {
  return (
    <StaffScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Active Queue" subtitle="Students waiting to be served" />
        {activeQueue.length ? (
          <>
            <View style={styles.queueHero}>
              <Text style={styles.queueLabel}>Now Serving</Text>
              <Text style={styles.queueNumber}>
                {activeQueue.find((entry) => entry.status === 'Serving')?.ticket ?? '—'}
              </Text>
              <Text style={styles.queueSubtle}>
                {activeQueue.find((entry) => entry.status === 'Serving')?.name ?? 'No one is being served'}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={() => router.push('/now-serving')}>
                <Text style={styles.primaryButtonText}>Call Next</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, { flex: 1 }]}>
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </Pressable>
            </View>
            {activeQueue.map((entry) => (
              <View key={entry.ticket} style={styles.queueRow}>
                <Text style={styles.ticketBox}>{entry.ticket}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{entry.name}</Text>
                  <Text style={styles.itemSubtle}>{entry.service}</Text>
                </View>
                <Badge label={entry.status} tone={entry.status === 'Serving' ? 'green' : 'warm'} />
              </View>
            ))}
          </>
        ) : (
          <EmptyState title="The queue is empty" message="Students will appear here after they join the queue." />
        )}
      </ScrollView>
    </StaffScreen>
  );
}

export function NowServingScreen() {
  return (
    <StaffScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Now Serving" subtitle="Current cashier transaction" backTo="/active-queue" />
        <EmptyState title="No active ticket" message="Call the next student from the active queue when someone is waiting." />
      </ScrollView>
    </StaffScreen>
  );
}

export function AppointmentManagementScreen() {
  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Appointments" subtitle="Approved, pending, and completed bookings" />
        <EmptyState title="No appointments" message="Appointment statuses will appear here when requests are received." />
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
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    getOperatingHours()
      .then((result) => {
        if (isMounted) setHours(result);
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
  const firstSlot = parseTimeToMinutes(hours.openTime);
  const lastSlot = parseTimeToMinutes(hours.closeTime);
  const invalidHours =
    firstSlot === undefined || lastSlot === undefined || firstSlot >= lastSlot;

  return (
    <StaffScreen current="services">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Schedule" subtitle="Operating hours and availability" backTo="/service-management" />
        {error ? <ErrorBanner message={error} /> : null}
        {notice ? <Text style={{ color: palette.greenDark, fontWeight: '700' }}>{notice}</Text> : null}
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
                    label="Opens (24-hour time)"
                    value={hours.openTime}
                    onChangeText={(openTime) => setHours((current) => ({ ...current, openTime }))}
                    placeholder="08:00"
                  />
                </View>
                <View style={styles.settingsTimeField}>
                  <Field
                    label="Closes (24-hour time)"
                    value={hours.closeTime}
                    onChangeText={(closeTime) => setHours((current) => ({ ...current, closeTime }))}
                    placeholder="17:00"
                  />
                </View>
              </View>
              {invalidHours ? (
                <Text style={styles.settingsValidation}>Enter valid HH:MM times and make sure closing is later than opening.</Text>
              ) : null}
              <Text style={[styles.itemTitle, { marginTop: 16 }]}>Appointment slot length</Text>
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
                setNotice(undefined);
                try {
                  await saveOperatingHours(hours);
                  setNotice('Booking calendar saved.');
                } catch {
                  setError('Could not save the booking calendar. Check your connection and staff access.');
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
  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Queue Capacity" subtitle="Limit and monitor virtual traffic load" backTo="/service-management" />
        <EmptyState title="No capacity settings" message="Queue limits and service times will appear here after they are configured." />
      </ScrollView>
    </StaffScreen>
  );
}

export function StaffManagementScreen() {
  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Staff Accounts" subtitle="Manage authorized cashier personnel" backTo="/service-management" />
        {staffMembers.length ? (
          staffMembers.map((member) => (
            <View key={member.name} style={styles.queueRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {member.name} | {member.role}
                </Text>
                <Text style={styles.itemSubtle}>{member.status}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No staff accounts" message="Authorized staff accounts will appear here." />
        )}
      </ScrollView>
    </StaffScreen>
  );
}

export function TransactionRecordsScreen() {
  return (
    <StaffScreen current="dashboard">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Transaction Log" subtitle="History of campus cashier services" backTo="/cashier-dashboard" />
        <EmptyState title="No transactions yet" message="Completed cashier transactions will appear here." />
      </ScrollView>
    </StaffScreen>
  );
}
