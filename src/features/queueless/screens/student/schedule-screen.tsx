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
  parseTimeToMinutes,
  type OperatingHours,
} from '../../settings';
import { palette } from '../../palette';
import { styles } from '../../styles';

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function createTimeSlots(hours: OperatingHours, date?: string) {
  const openAt = parseTimeToMinutes(hours.openTime);
  const closeAt = parseTimeToMinutes(hours.closeTime);
  if (openAt === undefined || closeAt === undefined || openAt >= closeAt) return [];

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const earliestSlot = date === formatLocalDate(now) ? currentMinutes + 1 : 0;
  const slots: string[] = [];
  for (let minute = openAt; minute + hours.slotMinutes <= closeAt; minute += hours.slotMinutes) {
    if (minute < earliestSlot) continue;
    const hour = String(Math.floor(minute / 60)).padStart(2, '0');
    const minutes = String(minute % 60).padStart(2, '0');
    slots.push(`${hour}:${minutes}`);
  }
  return slots;
}

export default function ScheduleScreen() {
  const { serviceTitle } = useLocalSearchParams<{ serviceTitle?: string }>();
  const service = services.find((item) => item.title === serviceTitle);
  const [hours, setHours] = useState<OperatingHours>(defaultOperatingHours);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
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
  const timeSlots = useMemo(() => createTimeSlots(hours, selectedDate), [hours, selectedDate]);
  const today = formatLocalDate(new Date());
  const serviceIsAvailable = service ? availability[service.id] !== false : false;

  function isDateAvailable(date: Date) {
    const dateKey = formatLocalDate(date);
    return (
      dateKey >= today &&
      date.getMonth() === month.getMonth() &&
      hours.enabledWeekdays.includes(date.getDay()) &&
      !hours.closedDates.includes(dateKey)
    );
  }

  return (
    <AppScreen current="schedule">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title="Schedule Spot"
          subtitle={service ? `${service.title} · Main Cashier` : 'Choose a service first'}
          backTo="/services"
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
              <Text style={styles.itemSubtle}>Select an available date to see appointment times.</Text>
            </View>
            {!hours.enabledWeekdays.length || !timeSlots.length ? (
              <EmptyState title="No appointment times" message="The cashier schedule does not currently have any open days or valid time slots." />
            ) : null}
            {selectedDate && timeSlots.length ? (
              <View style={styles.settingsCard}>
                <Text style={styles.itemTitle}>
                  Available times · {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.bookingTimesGrid}>
                  {timeSlots.map((time) => (
                    <Pressable
                      key={time}
                      accessibilityRole="button"
                      style={styles.bookingTime}
                      onPress={() =>
                        router.push({
                          pathname: '/appointment-request',
                          params: { serviceTitle: service.title, date: selectedDate, time },
                        })}>
                      <Text style={styles.bookingTimeText}>{time}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {selectedDate && !timeSlots.length ? (
              <EmptyState
                title="No times left for this date"
                message="Choose another open date to see available appointment times."
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}
