import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  AppScreen,
  AppointmentQrTicket,
  AppointmentQueueSummary,
  EmptyState,
  ErrorBanner,
  Header,
  QueueProgress,
} from '../../components';
import { useQueuelessPalette } from '../../palette';
import { useQueuelessStyles } from '../../styles';
import { useStudentAppointments } from '../../use-student-appointments';

export default function QueueScreen() {
  const palette = useQueuelessPalette();
  const styles = useQueuelessStyles();

  const { requests, isLoading, error } = useStudentAppointments();
  const approvedRequests = requests
    .filter((request) => request.status === 'approved' || request.status === 'serving')
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        (first.queueNumber ?? 0) - (second.queueNumber ?? 0),
    );
  const pendingRequests = requests.filter((request) => request.status === 'pending');

  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title="My Queue & Ticket"
          subtitle="Live queue status and your appointment QR code"
          backTo="/home"
        />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {approvedRequests.length ? (
          approvedRequests.map((request) => (
            <View key={request.id} style={styles.appointmentStatusCard}>
              <AppointmentQueueSummary request={request} />
              <AppointmentQrTicket request={request} />
              <Text style={styles.itemSubtle}>Appointment ID: {request.id}</Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push('/appointment-status')}>
                <Text style={styles.secondaryButtonText}>View Appointment Status</Text>
              </Pressable>
            </View>
          ))
        ) : !isLoading && pendingRequests.length ? (
          pendingRequests.map((request) => (
            <View key={request.id} style={styles.appointmentStatusCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{request.service}</Text>
                <Text style={styles.itemSubtle}>Pending</Text>
              </View>
              <Text style={styles.itemSubtle}>{request.date}</Text>
              <QueueProgress step={0} />
              <Text style={styles.queueActionHint}>
                Request received. The cashier must approve it before your queue number and QR ticket
                are ready.
              </Text>
            </View>
          ))
        ) : !isLoading && !error ? (
          <EmptyState
            title="You’re not in a queue"
            message="Book an appointment to get a queue ticket and track your place here."
          />
        ) : null}
        <View style={styles.buttonStack}>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/home')}>
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
