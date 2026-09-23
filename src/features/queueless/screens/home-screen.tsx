import { router } from 'expo-router';
import { CalendarPlus, CheckCircle2, Clock3, Plus, Ticket } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen, Badge } from '../components';
import { styles } from '../styles';

export default function HomeScreen() {
  return (
    <AppScreen current="home">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileBar}>
          <View>
            <Text style={styles.eyebrow}>Welcome back,</Text>
            <Text style={styles.h1}>Hello, Maria!</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MS</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Badge label="Upcoming Spot" tone="warm" />
            <Badge label="A025" tone="green" />
          </View>
          <Text style={styles.cardTitle}>Tuition Payment</Text>
          <Text style={styles.cardSubtle}>State University Main Cashier</Text>
          <View style={styles.cardRule} />
          <View style={styles.footerRow}>
            <View style={styles.rowStart}>
              <CalendarPlus size={15} color={styles.metaText.color} />
              <Text style={styles.metaText}>Today, Sep 16</Text>
            </View>
            <View style={styles.rowStart}>
              <Clock3 size={15} color={styles.metaText.color} />
              <Text style={styles.metaText}>10:00 AM</Text>
            </View>
          </View>
        </View>

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
        <View style={styles.listItem}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={20} color={styles.successIconText.color} />
          </View>
          <View>
            <Text style={styles.itemTitle}>Document Request Paid</Text>
            <Text style={styles.itemSubtle}>Completed on Sep 12, 2026</Text>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
