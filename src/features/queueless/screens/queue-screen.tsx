import { ScrollView, Text, View } from 'react-native';

import { AppScreen, Badge, Header } from '../components';
import { styles } from '../styles';

export default function QueueScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="My Queue" subtitle="Live ticket status" backTo="/home" />
        <View style={styles.queueHero}>
          <Text style={styles.queueLabel}>Now Serving</Text>
          <Text style={styles.queueNumber}>A021</Text>
          <Text style={styles.queueSubtle}>Your ticket: A025</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Badge label="4 ahead" tone="warm" />
            <Badge label="Approx. 20 mins" tone="green" />
          </View>
          <Text style={styles.cardTitle}>Tuition Payment</Text>
          <Text style={styles.cardSubtle}>Please arrive 5 minutes before your slot.</Text>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>
        {['A022', 'A023', 'A024', 'A025'].map((ticket, index) => (
          <View key={ticket} style={styles.queueRow}>
            <Text style={styles.ticketBox}>{ticket}</Text>
            <View>
              <Text style={styles.itemTitle}>{index === 3 ? 'Maria Santos' : 'Student ticket'}</Text>
              <Text style={styles.itemSubtle}>{index === 3 ? 'Your upcoming turn' : 'Waiting'}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}
