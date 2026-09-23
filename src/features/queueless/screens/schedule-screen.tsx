import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen, Header } from '../components';
import { styles } from '../styles';

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(16);
  const calendarDays = useMemo(() => ['31', ...Array.from({ length: 30 }, (_, index) => `${index + 1}`)], []);

  return (
    <AppScreen current="schedule">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Schedule Spot" subtitle="Tuition Payment Cashier" backTo="/services" />
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <Text style={styles.cardTitle}>September 2026</Text>
            <Text style={styles.monthArrows}>{'<  >'}</Text>
          </View>
          <View style={styles.weekRow}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
              <Text key={day} style={styles.weekDay}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.dateGrid}>
            {calendarDays.slice(0, 35).map((day, index) => {
              const numericDay = Number(day);
              const isSelected = numericDay === selectedDate && index !== 0;
              return (
                <Pressable
                  key={`${day}-${index}`}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => Number.isFinite(numericDay) && setSelectedDate(numericDay)}>
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={styles.sectionTitle}>Available Times</Text>
        {['9:00 AM', '10:00 AM', '10:30 AM', '1:30 PM'].map((time, index) => (
          <Pressable
            key={time}
            style={[styles.timeSlot, index === 1 && styles.timeSlotSelected]}
            onPress={() => router.push('/queue')}>
            <Text style={[styles.timeText, index === 1 && styles.timeTextSelected]}>{time}</Text>
            <Text style={[styles.itemSubtle, index === 1 && styles.timeTextSelected]}>
              {index === 1 ? 'Selected' : 'Open'}
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.primaryButton} onPress={() => router.push('/appointment-request')}>
          <Text style={styles.primaryButtonText}>Book Appointment</Text>
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}
