import { router } from 'expo-router';
import { Plus, Ticket } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import {
  AppScreen,
  AppointmentQrTicket,
  AppointmentQueueSummary,
  Badge,
  EmptyState,
  ErrorBanner,
} from '../../components';
import { getCurrentStudentProfile } from '../../auth/auth';
import type { StudentProfile } from '../../auth/auth';
import { cancelAppointmentRequest } from '../../appointments/appointment-requests';
import { useQueuelessPalette } from '../../palette';
import { useQueuelessStyles } from '../../styles';
import { useStudentAppointments } from '../../appointments/hooks/use-student-appointments';
import { formatLocalDate } from '../../schedule/schedule-utils';

export default function HomeScreen() {
  const palette = useQueuelessPalette();
  const styles = useQueuelessStyles();
  const { width } = useWindowDimensions();
  const compactLayout = width < 360;
  const [cancelConfirmationId, setCancelConfirmationId] = useState<string>();
  const [processingId, setProcessingId] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const {
    requests: appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
  } = useStudentAppointments();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    getCurrentStudentProfile()
      .then((currentProfile) => {
        if (isMounted) setProfile(currentProfile);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setProfileError(
            error instanceof Error ? error.message : 'Could not load your account details.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const initials =
    profile?.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'Q';
  const today = formatLocalDate(new Date());
  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        appointment.date >= today &&
        appointment.status !== 'rejected' &&
        appointment.status !== 'completed' &&
        appointment.status !== 'cancelled',
    )
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        (first.queueNumber ?? Number.MAX_SAFE_INTEGER) -
          (second.queueNumber ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 3);

  function canReschedule(appointment: (typeof appointments)[number]) {
    return (
      ['pending', 'approved'].includes(appointment.status) &&
      appointment.date > today &&
      !appointment.arrivedAt
    );
  }

  function canCancel(appointment: (typeof appointments)[number]) {
    return (
      ['pending', 'approved'].includes(appointment.status) &&
      appointment.date >= today &&
      !appointment.arrivedAt
    );
  }

  async function confirmCancellation(appointmentId: string) {
    setProcessingId(appointmentId);
    setActionError(undefined);
    try {
      await cancelAppointmentRequest(appointmentId);
      setCancelConfirmationId(undefined);
    } catch (cancelError) {
      setActionError(
        cancelError instanceof Error ? cancelError.message : 'Could not cancel this appointment.',
      );
    } finally {
      setProcessingId(undefined);
    }
  }

  function renderCancellationAction(appointment: (typeof appointments)[number]) {
    if (!canCancel(appointment)) return null;

    return cancelConfirmationId === appointment.id ? (
      <View style={styles.queueActionHint}>
        <Text style={styles.itemTitle}>Cancel this appointment?</Text>
        <Text style={styles.itemSubtle}>
          It will be removed from the queue, and its place will be released.
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryButton, { flex: 1, backgroundColor: palette.dangerAction }]}
            disabled={processingId === appointment.id}
            accessibilityRole="button"
            onPress={() => void confirmCancellation(appointment.id)}>
            {processingId === appointment.id ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm cancel</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { flex: 1 }]}
            disabled={processingId === appointment.id}
            accessibilityRole="button"
            onPress={() => setCancelConfirmationId(undefined)}>
            <Text style={styles.secondaryButtonText}>Keep appointment</Text>
          </Pressable>
        </View>
      </View>
    ) : (
      <Pressable
        style={[
          styles.secondaryButton,
          { borderColor: palette.dangerBorder, backgroundColor: palette.dangerSoft },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Cancel ${appointment.service} appointment`}
        onPress={() => {
          setActionError(undefined);
          setCancelConfirmationId(appointment.id);
        }}>
        <Text style={[styles.secondaryButtonText, { color: palette.danger }]}>
          Cancel appointment
        </Text>
      </Pressable>
    );
  }

  function openReschedule(appointment: (typeof appointments)[number]) {
    router.push({
      pathname: '/schedule',
      params: {
        serviceTitle: appointment.service,
        requestId: appointment.id,
        originalDate: appointment.date,
      },
    });
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.profileLoading}>
            <ActivityIndicator color={palette.greenDark} />
            <Text style={styles.cardSubtle}>Loading your account...</Text>
          </View>
        ) : (
          <View style={[styles.homeWelcomeCard, compactLayout && styles.homeWelcomeCardCompact]}>
            <View style={styles.homeWelcomeCopy}>
              <Text style={styles.homeWelcomeEyebrow}>Welcome to QueueLess</Text>
              <Text style={[styles.homeWelcomeTitle, compactLayout && styles.homeWelcomeTitleCompact]}>
                {profile?.displayName ?? 'Student'}
              </Text>
              <Text style={[styles.homeWelcomeSubtitle, compactLayout && styles.homeWelcomeSubtitleCompact]}>
                {profile?.studentNumber ? `Student ID · ${profile.studentNumber}` : 'Your student dashboard'}
              </Text>
            </View>
            <View style={[styles.homeWelcomeAvatar, compactLayout && styles.homeWelcomeAvatarCompact]}>
              <Text style={[styles.homeWelcomeAvatarText, compactLayout && styles.homeWelcomeAvatarTextCompact]}>
                {initials}
              </Text>
            </View>
          </View>
        )}
        {profileError ? <ErrorBanner message={profileError} /> : null}
        {appointmentsError ? <ErrorBanner message={appointmentsError} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {appointmentsLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {upcomingAppointments.map((appointment) =>
          appointment.status === 'approved' || appointment.status === 'serving' ? (
            <View key={appointment.id} style={styles.upcomingAppointmentApproved}>
              <AppointmentQueueSummary request={appointment} />
              <AppointmentQrTicket request={appointment} />
              {canReschedule(appointment) ? (
                <Pressable
                  style={styles.secondaryButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Reschedule ${appointment.service} appointment`}
                  onPress={() => openReschedule(appointment)}>
                  <Text style={styles.secondaryButtonText}>Reschedule appointment</Text>
                </Pressable>
              ) : null}
              {renderCancellationAction(appointment)}
            </View>
          ) : (
            <View key={appointment.id} style={styles.appointmentStatusCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{appointment.service}</Text>
                <Badge
                  label={appointment.status[0].toUpperCase() + appointment.status.slice(1)}
                  tone="warm"
                />
              </View>
              <Text style={styles.itemSubtle}>
                {appointment.date}
              </Text>
              {canReschedule(appointment) ? (
                <Pressable
                  style={styles.secondaryButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Reschedule ${appointment.service} appointment`}
                  onPress={() => openReschedule(appointment)}>
                  <Text style={styles.secondaryButtonText}>Reschedule appointment</Text>
                </Pressable>
              ) : null}
              {renderCancellationAction(appointment)}
            </View>
          ),
        )}
        {!appointmentsLoading && !upcomingAppointments.length ? (
          <EmptyState title="No upcoming appointments" message="Your booked cashier visits will appear here." />
        ) : null}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={[styles.actionRow, compactLayout && styles.actionRowCompact]}>
          <Pressable
            style={[styles.actionCard, compactLayout && styles.actionCardCompact]}
            onPress={() => router.push('/services')}
            accessibilityRole="button"
            accessibilityLabel="Book a campus spot"
            accessibilityHint="Opens the services screen to reserve a queue appointment">
            <View style={[styles.actionIcon, compactLayout && styles.actionIconCompact]}>
              <Plus size={21} color={styles.actionIconText.color} strokeWidth={2.5} />
            </View>
            <Text style={[styles.actionLabel, compactLayout && styles.actionLabelCompact]}>Book Spot</Text>
          </Pressable>
          <Pressable
            style={[styles.actionCard, compactLayout && styles.actionCardCompact]}
            onPress={() => router.push('/queue')}
            accessibilityRole="button"
            accessibilityLabel="View my queue"
            accessibilityHint="Opens your current queue status and appointment ticket">
            <View style={[styles.actionIcon, compactLayout && styles.actionIconCompact]}>
              <Ticket size={20} color={styles.actionIconText.color} strokeWidth={2.5} />
            </View>
            <Text style={[styles.actionLabel, compactLayout && styles.actionLabelCompact]}>My Queue</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {appointments
          .filter((appointment) =>
            ['completed', 'rejected', 'skipped', 'cancelled'].includes(appointment.status),
          )
          .slice(0, 3)
          .map((appointment) => (
            <View key={appointment.id} style={styles.compactCard}>
              <Text style={styles.itemTitle}>{appointment.service}</Text>
              <Text style={styles.itemSubtle}>
                {appointment.date} · {appointment.status[0].toUpperCase() + appointment.status.slice(1)}
              </Text>
            </View>
          ))}
        {!appointmentsLoading &&
        !appointments.some((appointment) =>
          ['completed', 'rejected', 'skipped', 'cancelled'].includes(appointment.status),
        ) ? (
          <EmptyState title="No activity yet" message="Your completed appointments will appear here." />
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}
