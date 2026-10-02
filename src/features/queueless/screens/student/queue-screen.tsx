import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  AppScreen,
  AppointmentQrTicket,
  AppointmentQueueSummary,
  EmptyState,
  ErrorBanner,
  Header,
} from '../../components';
import { styles } from '../../styles';
import { useStudentAppointments } from '../../use-student-appointments';

export default function QueueScreen() {
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
        <Header title="My Queue" subtitle="Live ticket status" backTo="/home" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color="#0F8F8B" /> : null}
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
          <EmptyState
            title="Waiting for approval"
            message="Your appointment was received. Queue number and estimated time will show here after the cashier approves it."
          />
        ) : !isLoading && !error ? (
          <EmptyState
            title="You’re not in a queue"
            message="Book an appointment to get a queue ticket and track your place here."
          />
        ) : null}
        <View style={styles.buttonStack}>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/appointment-ticket')}>
            <Text style={styles.primaryButtonText}>Continue to My Ticket</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/home')}>
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
