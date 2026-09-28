import { router, useLocalSearchParams } from 'expo-router';
import { AtSign, Check, Hash, MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppScreen, Badge, EmptyState, ErrorBanner, Field, Header } from '../../components';
import {
  getAuthErrorMessage,
  registerStudent,
  resendVerificationEmail,
} from '../../auth';
import { services } from '../../data';
import { styles } from '../../styles';

export function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
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
                <MailCheck size={36} color="#0F8F8B" strokeWidth={1.8} />
              </View>
              <Text style={styles.verificationTitle}>Check your inbox</Text>
              <Text style={styles.verificationSubtitle}>
                Your account is almost ready. Verify your email to securely sign in to QueueLess.
              </Text>
            </View>
            <View style={styles.verificationEmail}>
              <View style={styles.verificationEmailIcon}>
                <AtSign size={18} color="#0F8F8B" />
              </View>
              <View style={styles.verificationEmailCopy}>
                <Text style={styles.verificationHint}>Verification link sent to</Text>
                <Text style={styles.verificationAddress}>{email.trim()}</Text>
              </View>
            </View>
            <View style={styles.verificationSteps}>
              <View style={styles.verificationStep}>
                <View style={styles.verificationStepIcon}>
                  <Check size={15} color="#0F8F8B" strokeWidth={3} />
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
                <ActivityIndicator color="#FFFFFF" />
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
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonMuted]}
              accessibilityRole="button"
              disabled={isLoading}
              onPress={async () => {
                setSubmitted(true);
                setAuthError(undefined);
                if (!canSubmit || isLoading) return;

                setIsLoading(true);
                try {
                  await registerStudent(displayName, email, password, studentNumber);
                  setVerificationSent(true);
                } catch (error) {
                  setAuthError(getAuthErrorMessage(error, 'register'));
                } finally {
                  setIsLoading(false);
                }
              }}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
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
  const { serviceTitle } = useLocalSearchParams<{ serviceTitle?: string }>();
  const service = services.find((item) => item.title === serviceTitle);

  return (
    <AppScreen current="services">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title={service?.title ?? 'Service unavailable'} subtitle="Cashier service details" backTo="/services" />
        {service ? (
          <>
            <View style={styles.card}>
              <Badge label="Cashier service" tone="green" />
              <Text style={styles.cardTitle}>State University Main Cashier</Text>
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
  const { date, time, serviceTitle } = useLocalSearchParams<{
    date?: string;
    time?: string;
    serviceTitle?: string;
  }>();
  const service = services.find((item) => item.title === serviceTitle);
  const parsedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : null;
  const dateIsValid =
    parsedDate !== null &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.getFullYear() === Number(date?.slice(0, 4)) &&
    parsedDate.getMonth() + 1 === Number(date?.slice(5, 7)) &&
    parsedDate.getDate() === Number(date?.slice(8, 10));

  return (
    <AppScreen current="schedule">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Appointment Request" subtitle="Review before submitting" backTo="/schedule" />
        {!service || !dateIsValid || !time ? (
          <ErrorBanner message="Choose a service, date, and time before submitting this request." />
        ) : null}
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
          ['Time', time || 'Choose a time'],
          ['Cashier', 'State University Main Cashier'],
        ].map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <Text style={styles.itemSubtle}>{label}</Text>
            <Text style={styles.itemTitle}>{value}</Text>
          </View>
        ))}
        <Pressable
          style={[styles.primaryButton, (!service || !dateIsValid || !time) && styles.primaryButtonMuted]}
          disabled={!service || !dateIsValid || !time}
          accessibilityRole="button"
          accessibilityState={{ disabled: !service || !dateIsValid || !time }}
          onPress={() => router.push('/appointment-confirmation')}>
          <Text style={styles.primaryButtonText}>Submit Request</Text>
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

export function AppointmentConfirmationScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>OK</Text>
          </View>
          <Text style={styles.h1}>Request preview complete</Text>
          <Text style={styles.mutedCenter}>
            This app preview does not save appointment requests. Connect an account to submit and track a real request.
          </Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/home')}>
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

export function AppointmentStatusScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Appointment Status" subtitle="Latest request update" backTo="/home" />
        <EmptyState title="No appointment requests" message="When you submit a request, its status will appear here." />
      </ScrollView>
    </AppScreen>
  );
}

export function AppointmentTicketScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Virtual Ticket" subtitle="Digital appointment receipt" backTo="/appointment-status" />
        <EmptyState title="No ticket yet" message="A queue ticket will appear here after an appointment is confirmed." />
      </ScrollView>
    </AppScreen>
  );
}

export function MyAppointmentsScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="My Appointments" subtitle="Upcoming and recent requests" backTo="/home" />
        <EmptyState title="No appointments yet" message="Your upcoming and past appointments will appear here." />
      </ScrollView>
    </AppScreen>
  );
}

export function QueueHistoryScreen() {
  return (
    <AppScreen current="profile">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Queue History" subtitle="Completed cashier transactions" backTo="/profile" />
        <EmptyState title="No queue history" message="Completed queue visits will appear here." />
      </ScrollView>
    </AppScreen>
  );
}

export function NotificationsScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Notifications" subtitle="Queue and appointment alerts" backTo="/home" />
        <EmptyState title="No notifications" message="Queue and appointment updates will appear here." />
      </ScrollView>
    </AppScreen>
  );
}
