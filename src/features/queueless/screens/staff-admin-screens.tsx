import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Field, StaffHeader, StaffScreen } from '../components';
import { activeQueue, appointmentRequests, services, staffMembers } from '../data';
import { styles } from '../styles';

export function StaffLoginScreen() {
  const [email, setEmail] = useState('rosa.garcia@su.edu');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.loginHero}>
        <View style={styles.schoolShield}>
          <Text style={styles.schoolShieldText}>SU</Text>
        </View>
        <Text style={styles.schoolName}>Cashier Portal</Text>
        <Text style={styles.mutedCenter}>Authorized staff and administrator access</Text>
      </View>
      <View style={styles.form}>
        <Field label="Staff Email" value={email} onChangeText={setEmail} placeholder="staff@school.edu" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secure placeholder="Enter your password" />
      </View>
      <View style={styles.loginActions}>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/cashier-dashboard')}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function CashierDashboardScreen() {
  return (
    <StaffScreen current="dashboard">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Cashier Dashboard" subtitle="Today at State University Main Cashier" />
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Pending Requests</Text>
            <Text style={styles.h1}>12</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Now Serving</Text>
            <Text style={styles.h1}>A021</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Served Today</Text>
            <Text style={styles.h1}>24</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Avg Wait</Text>
            <Text style={styles.h1}>12m</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Staff Actions</Text>
        {([
          ['Review Requests', '/appointment-requests'],
          ['Manage Active Queue', '/active-queue'],
          ['Update Capacity', '/queue-capacity'],
          ['View Transaction Log', '/transaction-records'],
        ] as const).map(([label, href]) => (
          <Pressable key={label} style={styles.compactCard} onPress={() => router.push(href)}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{label}</Text>
              <Text style={styles.chevron}>{'>'}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </StaffScreen>
  );
}

export function AppointmentRequestsScreen() {
  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Appointment Requests" subtitle="Review pending student submissions" />
        {appointmentRequests.map((request) => (
          <Pressable key={request.ticket} style={styles.compactCard} onPress={() => router.push('/appointment-details')}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.itemTitle}>{request.name}</Text>
                <Text style={styles.itemSubtle}>
                  {request.service} | {request.time}
                </Text>
              </View>
              <Badge label={request.status} tone={request.status === 'Approved' ? 'green' : 'warm'} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </StaffScreen>
  );
}

export function AppointmentDetailsScreen() {
  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Request Details" subtitle="Maria Santos | Tuition Payment" backTo="/appointment-requests" />
        {[
          ['Student Number', '2022-10458'],
          ['Requested Date', 'September 16, 2026'],
          ['Requested Time', '10:00 AM'],
          ['Service', 'Tuition Payment'],
          ['Status', 'Pending'],
        ].map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <Text style={styles.itemSubtle}>{label}</Text>
            <Text style={styles.itemTitle}>{value}</Text>
          </View>
        ))}
        <View style={styles.actionRow}>
          <Pressable style={[styles.secondaryButton, { flex: 1 }]}>
            <Text style={styles.secondaryButtonText}>Reject</Text>
          </Pressable>
          <Pressable style={[styles.primaryButton, { flex: 1 }]}>
            <Text style={styles.primaryButtonText}>Approve</Text>
          </Pressable>
        </View>
      </ScrollView>
    </StaffScreen>
  );
}

export function ActiveQueueScreen() {
  return (
    <StaffScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Active Queue" subtitle="Call, serve, or skip waiting students" />
        <View style={styles.queueHero}>
          <Text style={styles.queueLabel}>Now Serving</Text>
          <Text style={styles.queueNumber}>A021</Text>
          <Text style={styles.queueSubtle}>Nina Cruz</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={() => router.push('/now-serving')}>
            <Text style={styles.primaryButtonText}>Call Next</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, { flex: 1 }]}>
            <Text style={styles.secondaryButtonText}>Skip</Text>
          </Pressable>
        </View>
        {activeQueue.map((entry) => (
          <View key={entry.ticket} style={styles.queueRow}>
            <Text style={styles.ticketBox}>{entry.ticket}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{entry.name}</Text>
              <Text style={styles.itemSubtle}>{entry.service}</Text>
            </View>
            <Badge label={entry.status} tone={entry.status === 'Serving' ? 'green' : 'warm'} />
          </View>
        ))}
      </ScrollView>
    </StaffScreen>
  );
}

export function NowServingScreen() {
  return (
    <StaffScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Now Serving" subtitle="Current cashier transaction" backTo="/active-queue" />
        <View style={styles.queueHero}>
          <Text style={styles.queueLabel}>Ticket</Text>
          <Text style={styles.queueNumber}>A021</Text>
          <Text style={styles.queueSubtle}>Nina Cruz | Tuition Payment</Text>
        </View>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Mark as Served</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Skip Student</Text>
        </Pressable>
      </ScrollView>
    </StaffScreen>
  );
}

export function AppointmentManagementScreen() {
  return (
    <StaffScreen current="requests">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Appointments" subtitle="Approved, pending, and completed bookings" />
        {['Pending', 'Approved', 'Completed', 'Cancelled'].map((status) => (
          <View key={status} style={styles.compactCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{status}</Text>
              <Badge label={status === 'Pending' ? '12' : status === 'Approved' ? '18' : '4'} tone="green" />
            </View>
          </View>
        ))}
      </ScrollView>
    </StaffScreen>
  );
}

export function ServiceManagementScreen() {
  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Services" subtitle="Manage cashier transaction types" />
        {services.map((service) => (
          <View key={service.title} style={styles.serviceCard}>
            <View style={styles.serviceIcon}>
              <Text style={styles.serviceIconText}>{service.icon}</Text>
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.itemTitle}>{service.title}</Text>
              <Text style={styles.itemSubtle}>{service.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </StaffScreen>
  );
}

export function ScheduleSettingsScreen() {
  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Schedule Settings" subtitle="Operating hours and availability" backTo="/service-management" />
        {[
          ['Weekdays', '8:00 AM - 4:00 PM'],
          ['Lunch Break', '12:00 PM - 1:00 PM'],
          ['Slot Interval', '30 minutes'],
          ['Closed Days', 'Saturday and Sunday'],
        ].map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <Text style={styles.itemSubtle}>{label}</Text>
            <Text style={styles.itemTitle}>{value}</Text>
          </View>
        ))}
      </ScrollView>
    </StaffScreen>
  );
}

export function QueueCapacityScreen() {
  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Queue Capacity" subtitle="Limit and monitor virtual traffic load" backTo="/service-management" />
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.itemTitle}>Today Ticket Limit</Text>
            <Text style={styles.itemSubtle}>32/50 Used</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.itemSubtle}>18 remaining appointments can be booked today.</Text>
        </View>
        {[
          ['Max Appointments / Day', '50'],
          ['Max Tickets / Time Slot', '5'],
          ['Avg Service Duration', '5m'],
        ].map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.itemTitle}>{label}</Text>
                <Text style={styles.itemSubtle}>Configured by cashier admin</Text>
              </View>
              <Text style={styles.h1}>{value}</Text>
            </View>
          </View>
        ))}
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </StaffScreen>
  );
}

export function StaffManagementScreen() {
  return (
    <StaffScreen current="settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Staff Accounts" subtitle="Manage authorized cashier personnel" backTo="/service-management" />
        {staffMembers.map((member) => (
          <View key={member.name} style={styles.queueRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>
                {member.name} | {member.role}
              </Text>
              <Text style={styles.itemSubtle}>Last Active: Sep 16, 2026</Text>
            </View>
            <Text style={styles.itemSubtle}>{member.status}</Text>
          </View>
        ))}
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Add Staff Member</Text>
        </Pressable>
      </ScrollView>
    </StaffScreen>
  );
}

export function TransactionRecordsScreen() {
  return (
    <StaffScreen current="dashboard">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader title="Transaction Log" subtitle="History of campus cashier services" backTo="/cashier-dashboard" />
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Total Today</Text>
            <Text style={styles.h1}>24</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.itemSubtle}>Avg Wait Time</Text>
            <Text style={styles.h1}>12m</Text>
          </View>
        </View>
        {activeQueue.slice(1).map((entry) => (
          <View key={entry.ticket} style={styles.queueRow}>
            <Text style={styles.ticketBox}>{entry.ticket}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{entry.name}</Text>
              <Text style={styles.itemSubtle}>{entry.service}</Text>
            </View>
            <Badge label="Served" tone="green" />
          </View>
        ))}
      </ScrollView>
    </StaffScreen>
  );
}
