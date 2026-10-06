import { router } from 'expo-router';
import { Plus, Ticket } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  AppScreen,
  AppointmentQrTicket,
  AppointmentQueueSummary,
  Badge,
  EmptyState,
  ErrorBanner,
} from '../../components';
import { getCurrentStudentProfile } from '../../auth';
import type { StudentProfile } from '../../auth';
import { useQueuelessPalette } from '../../palette';
import { useQueuelessStyles } from '../../styles';
import { useStudentAppointments } from '../../use-student-appointments';

export default function HomeScreen() {
  const palette = useQueuelessPalette();
  const styles = useQueuelessStyles();

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
  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
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

  return (
    <AppScreen current="home">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.profileLoading}>
            <ActivityIndicator color={palette.greenDark} />
            <Text style={styles.cardSubtle}>Loading your account...</Text>
          </View>
        ) : (
          <View style={styles.homeWelcomeCard}>
            <View style={styles.homeWelcomeCopy}>
              <Text style={styles.homeWelcomeEyebrow}>Welcome to QueueLess</Text>
              <Text style={styles.homeWelcomeTitle}>{profile?.displayName ?? 'Student'}</Text>
              <Text style={styles.homeWelcomeSubtitle}>
                {profile?.studentNumber ? `Student ID · ${profile.studentNumber}` : 'Your student dashboard'}
              </Text>
            </View>
            <View style={styles.homeWelcomeAvatar}>
              <Text style={styles.homeWelcomeAvatarText}>{initials}</Text>
            </View>
          </View>
        )}
        {profileError ? <ErrorBanner message={profileError} /> : null}
        {appointmentsError ? <ErrorBanner message={appointmentsError} /> : null}
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {appointmentsLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {upcomingAppointments.map((appointment) =>
          appointment.status === 'approved' || appointment.status === 'serving' ? (
            <View key={appointment.id} style={styles.upcomingAppointmentApproved}>
              <AppointmentQueueSummary request={appointment} />
              <AppointmentQrTicket request={appointment} />
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
            </View>
          ),
        )}
        {!appointmentsLoading && !upcomingAppointments.length ? (
          <EmptyState title="No upcoming appointments" message="Your booked cashier visits will appear here." />
        ) : null}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/services')}>
            <View style={styles.actionIcon}>
              <Plus size={21} color={styles.actionIconText.color} strokeWidth={2.5} />
            </View>
            <Text style={styles.actionLabel}>Book Spot</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/queue')}>
            <View style={styles.actionIcon}>
              <Ticket size={20} color={styles.actionIconText.color} strokeWidth={2.5} />
            </View>
            <Text style={styles.actionLabel}>My Queue</Text>
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
