import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppScreen, Badge, Field, Header } from '../components';
import { styles } from '../styles';

export function RegisterScreen() {
  const [email, setEmail] = useState('student.name@student.su.edu');
  const [studentNumber, setStudentNumber] = useState('2026-00000');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Create Account" subtitle="Register your student profile" backTo="/login" />
        <Field label="Student Email" value={email} onChangeText={setEmail} placeholder="student.name@school.edu" keyboardType="email-address" />
        <Field label="Student Number" value={studentNumber} onChangeText={setStudentNumber} placeholder="2026-00000" keyboardType="numeric" />
        <Field label="Password" value={password} onChangeText={setPassword} secure placeholder="Create a password" />
        <Pressable style={styles.primaryButton} onPress={() => router.push('/home')}>
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ServiceDetailsScreen() {
  return (
    <AppScreen current="services">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Tuition Payment" subtitle="Cashier service details" backTo="/services" />
        <View style={styles.card}>
          <Badge label="Available Today" tone="green" />
          <Text style={styles.cardTitle}>State University Main Cashier</Text>
          <Text style={styles.cardSubtle}>
            Settle semester fees, installment dues, and school matriculation through a scheduled cashier visit.
          </Text>
          <View style={styles.cardRule} />
          <Text style={styles.itemSubtle}>Required: Student ID, assessment form, and payment reference.</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/schedule')}>
          <Text style={styles.primaryButtonText}>Choose Schedule</Text>
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

export function AppointmentRequestScreen() {
  return (
    <AppScreen current="schedule">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Appointment Request" subtitle="Review before submitting" backTo="/schedule" />
        {[
          ['Service', 'Tuition Payment'],
          ['Date', 'September 16, 2026'],
          ['Time', '10:00 AM'],
          ['Cashier', 'State University Main Cashier'],
        ].map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <Text style={styles.itemSubtle}>{label}</Text>
            <Text style={styles.itemTitle}>{value}</Text>
          </View>
        ))}
        <Pressable style={styles.primaryButton} onPress={() => router.push('/appointment-confirmation')}>
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
          <Text style={styles.h1}>Request Sent</Text>
          <Text style={styles.mutedCenter}>Your appointment is pending cashier approval.</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/appointment-status')}>
          <Text style={styles.primaryButtonText}>View Status</Text>
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
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Badge label="Approved" tone="green" />
            <Badge label="A025" tone="warm" />
          </View>
          <Text style={styles.cardTitle}>Tuition Payment</Text>
          <Text style={styles.cardSubtle}>Sep 16, 2026 at 10:00 AM</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/appointment-ticket')}>
            <Text style={styles.primaryButtonText}>Open Ticket</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export function AppointmentTicketScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Virtual Ticket" subtitle="Digital appointment receipt" backTo="/appointment-status" />
        <View style={styles.queueHero}>
          <Text style={styles.queueLabel}>Your Queue Number</Text>
          <Text style={styles.queueNumber}>A025</Text>
          <Text style={styles.queueSubtle}>Tuition Payment</Text>
        </View>
        {[
          ['Student', 'Maria Santos'],
          ['Date and Time', 'Sep 16, 2026 | 10:00 AM'],
          ['Now Serving', 'A021'],
          ['People Ahead', '4 students'],
          ['Estimated Wait', '20 minutes'],
        ].map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <Text style={styles.itemSubtle}>{label}</Text>
            <Text style={styles.itemTitle}>{value}</Text>
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

export function MyAppointmentsScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="My Appointments" subtitle="Upcoming and recent requests" backTo="/home" />
        {['Approved - Tuition Payment', 'Pending - Document Request', 'Completed - ID Processing'].map((item) => (
          <View key={item} style={styles.compactCard}>
            <Text style={styles.itemTitle}>{item}</Text>
            <Text style={styles.itemSubtle}>State University Main Cashier</Text>
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

export function QueueHistoryScreen() {
  return (
    <AppScreen current="profile">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Queue History" subtitle="Completed cashier transactions" backTo="/profile" />
        {['A020 - Document Request', 'A018 - Tuition Payment', 'A012 - General Transaction'].map((item) => (
          <View key={item} style={styles.queueRow}>
            <Text style={styles.ticketBox}>{item.slice(0, 4)}</Text>
            <View>
              <Text style={styles.itemTitle}>{item.slice(7)}</Text>
              <Text style={styles.itemSubtle}>Completed</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

export function NotificationsScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Notifications" subtitle="Queue and appointment alerts" backTo="/home" />
        {[
          'Your appointment was approved.',
          'Queue A025 is approaching.',
          'Please proceed when your number is called.',
        ].map((message) => (
          <View key={message} style={styles.compactCard}>
            <Text style={styles.itemTitle}>{message}</Text>
            <Text style={styles.itemSubtle}>Today</Text>
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}
