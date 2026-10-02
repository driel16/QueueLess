import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen, EmptyState, ErrorBanner, Header } from '../../components';
import { services } from '../../data';
import {
  defaultOperatingHours,
  formatLocalDate,
  getCalendarDates,
  getOperatingHours,
  getServiceAvailability,
  isOperatingDateAvailable,
  type OperatingHours,
} from '../../settings';
import { palette } from '../../palette';
import { styles } from '../../styles';

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function ScheduleScreen() {
  const { originalDate, requestId, serviceTitle } = useLocalSearchParams<{
    originalDate?: string;
    requestId?: string;
    serviceTitle?: string;
  }>();
  const service = services.find((item) => item.title === serviceTitle);
  const [hours, setHours] = useState<OperatingHours>(defaultOperatingHours);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [month, setMonth] = useState(() => {
    if (requestId && originalDate && /^\d{4}-\d{2}-\d{2}$/.test(originalDate)) {
      const original = new Date(`${originalDate}T12:00:00`);
      if (!Number.isNaN(original.getTime())) {
        return new Date(original.getFullYear(), original.getMonth(), 1);
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    Promise.all([getOperatingHours(), getServiceAvailability(services.map((item) => item.id))])
      .then(([schedule, serviceState]) => {
        if (!isMounted) return;
        setHours(schedule);
        setAvailability(serviceState);
      })
      .catch(() => {
        if (isMounted) setError('Could not load the booking calendar. Please check your connection and try again.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const calendarDates = useMemo(() => getCalendarDates(month), [month]);
  const today = formatLocalDate(new Date());
  const serviceIsAvailable = service ? availability[service.id] !== false : false;

  function isDateAvailable(date: Date) {
    const dateKey = formatLocalDate(date);
    return (
      date.getMonth() === month.getMonth() &&
      isOperatingDateAvailable(dateKey, hours, today) &&
      (!requestId || (dateKey > today && dateKey !== originalDate))
    );
  }

  return (
    <AppScreen current="schedule">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title={requestId ? 'Reschedule Appointment' : 'Join the Queue'}
          subtitle={
            service
              ? `${service.title} · Main Cashier`
              : 'Choose a service first'
          }
          backTo={requestId ? '/my-appointments' : '/services'}
        />
        {error ? <ErrorBanner message={error} /> : null}
        {!service ? (
          <ErrorBanner message="Choose a cashier service before scheduling an appointment." />
        ) : !isLoading && !error && !serviceIsAvailable ? (
          <EmptyState
            title="Service unavailable"
            message="The cashier has temporarily turned off this service. Choose another service to continue."
          />
        ) : isLoading ? (
          <ActivityIndicator color={palette.greenDark} />
        ) : !error ? (
          <>
            <View style={styles.calendarCard}>
              <View style={styles.bookingMonthControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  onPress={() => {
                    setSelectedDate(undefined);
                    setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                  }}>
                  <Text style={styles.bookingMonthArrow}>{'<'}</Text>
                </Pressable>
                <Text style={styles.bookingMonthLabel}>
                  {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  onPress={() => {
                    setSelectedDate(undefined);
                    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                  }}>
                  <Text style={styles.bookingMonthArrow}>{'>'}</Text>
                </Pressable>
              </View>
              <View style={styles.bookingCalendarGrid}>
                {weekdays.map((day, index) => (
                  <Text key={`${day}-${index}`} style={styles.bookingWeekday}>{day}</Text>
                ))}
                {calendarDates.map((date) => {
                  const dateKey = formatLocalDate(date);
                  const available = isDateAvailable(date);
                  const selected = selectedDate === dateKey;
                  return (
                    <Pressable
                      key={dateKey}
                      accessibilityRole="button"
                      accessibilityLabel={`${date.toLocaleDateString()}${available ? ', available' : ', unavailable'}`}
                      accessibilityState={{ selected, disabled: !available }}
                      disabled={!available}
                      onPress={() => setSelectedDate(dateKey)}
                      style={[
                        styles.bookingDate,
                        !available && styles.bookingDateUnavailable,
                        selected && styles.bookingDateSelected,
                      ]}>
                      <Text style={[styles.bookingDateText, selected && styles.bookingDateTextSelected]}>
                        {date.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.itemSubtle}>
                Select an available date to join that day’s cashier queue.
              </Text>
            </View>
            {selectedDate ? (
              <View style={styles.settingsCard}>
                <Text style={styles.itemTitle}>
                  Queue date ·{' '}
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.itemSubtle}>
                  You’ll join the cashier’s queue for this date. Your queue number and estimated
                  wait will be available after approval.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.primaryButton}
                  onPress={() =>
                    router.push({
                      pathname: '/appointment-request',
                      params: {
                        serviceTitle: service.title,
                        date: selectedDate,
                        ...(requestId ? { requestId } : {}),
                      },
                    })}>
                  <Text style={styles.primaryButtonText}>
                    {requestId ? 'Review new appointment date' : 'Continue with selected date'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}
