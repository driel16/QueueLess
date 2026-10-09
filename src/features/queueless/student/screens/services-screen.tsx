import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen, EmptyState, ErrorBanner, Header, formatAppointmentStatusLabel } from '../../components';
import { services } from '../../data';
import { getServiceAvailability } from '../../schedule/settings';
import { useQueuelessStyles } from '../../styles';
import { useQueuelessPalette } from '../../palette';
import { useStudentAppointments } from '../../appointments/hooks/use-student-appointments';

export default function ServicesScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const { requests, isLoading: appointmentsLoading } = useStudentAppointments();
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    getServiceAvailability(services.map((service) => service.id))
      .then((result) => {
        if (isMounted) setAvailability(result);
      })
      .catch(() => {
        if (isMounted) setError('Could not load available services. Please check your connection and try again.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const availableServices = services.filter((service) => availability[service.id] !== false);
  const activeAppointment = requests.find(
    (request) =>
      request.status === 'pending' ||
      request.status === 'approved' ||
      request.status === 'serving' ||
      request.status === 'skipped',
  );

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Cashier Services" subtitle="Choose a service to book your spot" backTo="/home" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {appointmentsLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {!appointmentsLoading && activeAppointment ? (
          <View style={styles.settingsCard}>
            <Text style={styles.itemTitle}>You already have an active appointment</Text>
            <Text style={styles.itemSubtle}>
              {activeAppointment.service} · {activeAppointment.date} ·{' '}
              {formatAppointmentStatusLabel(activeAppointment.status)}
            </Text>
            <Pressable
              style={styles.primaryButton}
              accessibilityRole="button"
              onPress={() => router.push('/my-appointments')}>
              <Text style={styles.primaryButtonText}>View My Appointment</Text>
            </Pressable>
          </View>
        ) : null}
        {!isLoading && !error && !activeAppointment && !availableServices.length ? (
          <EmptyState title="No services available" message="The cashier has temporarily turned off all bookable services." />
        ) : null}
        <View style={styles.serviceList}>
          {!isLoading && !error && !appointmentsLoading && !activeAppointment
            ? availableServices.map((service) => (
              <Pressable
                key={service.id}
                style={styles.serviceCard}
                accessibilityRole="button"
                accessibilityLabel={`${service.title} service`}
                accessibilityHint={`Opens details for the ${service.title} service`}
                onPress={() =>
                  router.push({ pathname: '/service-details', params: { serviceTitle: service.title } })
                }>
                <View style={styles.serviceIcon} importantForAccessibility="no" accessible={false}>
                  <Text style={styles.serviceIconText} accessible={false} importantForAccessibility="no">
                    {service.icon}
                  </Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.itemTitle}>{service.title}</Text>
                  <Text style={styles.itemSubtle}>{service.body}</Text>
                </View>
                <Text style={styles.chevron} accessible={false} importantForAccessibility="no">
                  {'>'}
                </Text>
              </Pressable>
            ))
            : null}
        </View>
      </ScrollView>
    </AppScreen>
  );
}
