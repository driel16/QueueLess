import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';

import {
  AppScreen,
  AppointmentQrTicket,
  AppointmentQueueSummary,
  EmptyState,
  ErrorBanner,
  Header,
  QueueProgress,
} from '../../components';
import { cancelAppointmentRequest } from '../../appointments/appointment-requests';
import { useQueuelessPalette } from '../../palette';
import { useQueuelessStyles } from '../../styles';
import { useStudentAppointments } from '../../appointments/hooks/use-student-appointments';

export default function QueueScreen() {
  const palette = useQueuelessPalette();
  const styles = useQueuelessStyles();

  const { requests, isLoading, error } = useStudentAppointments();
  const [cancelConfirmationId, setCancelConfirmationId] = useState<string>();
  const [processingId, setProcessingId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const approvedRequests = requests
    .filter((request) => request.status === 'approved' || request.status === 'serving')
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        (first.queueNumber ?? 0) - (second.queueNumber ?? 0),
    );
  const pendingRequests = requests.filter((request) => request.status === 'pending');

  const renderCancellationAction = (request: (typeof requests)[number]) => {
    if (
      (request.status !== 'pending' && request.status !== 'approved') ||
      request.arrivedAt
    ) {
      return null;
    }

    if (cancelConfirmationId !== request.id) {
      return (
        <Pressable
          style={[
            styles.secondaryButton,
            { borderColor: palette.dangerBorder, backgroundColor: palette.dangerSoft },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Cancel appointment for ${request.service}`}
          onPress={() => {
            setActionError(undefined);
            setCancelConfirmationId(request.id);
          }}>
          <Text style={[styles.secondaryButtonText, { color: palette.danger }]}>
            Cancel appointment
          </Text>
        </Pressable>
      );
    }

    return (
      <View style={styles.queueActionHint}>
        <Text style={styles.itemTitle}>Cancel this appointment?</Text>
        <Text style={styles.itemSubtle}>
          It will be removed from the queue, and its place will be released.
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryButton, { flex: 1, backgroundColor: palette.dangerAction }]}
            disabled={processingId === request.id}
            accessibilityRole="button"
            accessibilityLabel={`Confirm cancellation for ${request.service}`}
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
    );
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title="My Queue & Ticket"
          subtitle="Live queue status and your appointment QR code"
          backTo="/home"
        />
        {error ? <ErrorBanner message={error} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {approvedRequests.length ? (
          approvedRequests.map((request) => (
            <View key={request.id} style={styles.appointmentStatusCard}>
              <AppointmentQueueSummary request={request} />
              <AppointmentQrTicket request={request} />
              <Text style={styles.itemSubtle}>Appointment ID: {request.id}</Text>
              <Pressable
                style={styles.secondaryButton}
                accessibilityRole="button"
                accessibilityLabel={`View status for ${request.service}`}
                accessibilityHint="Opens the appointment status details for this queue item"
                onPress={() => router.push('/appointment-status')}>
                <Text style={styles.secondaryButtonText}>View Appointment Status</Text>
              </Pressable>
              {renderCancellationAction(request)}
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
              {renderCancellationAction(request)}
            </View>
          ))
        ) : !isLoading && !error ? (
          <EmptyState
            title="You’re not in a queue"
            message="Book an appointment to get a queue ticket and track your place here."
          />
        ) : null}
        <View style={styles.buttonStack}>
          <Pressable
            style={styles.secondaryButton}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            accessibilityHint="Returns to the student home screen"
            onPress={() => router.push('/home')}>
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
