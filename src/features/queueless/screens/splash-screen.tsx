import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../styles';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.splash}>
      <View style={styles.splashCenter}>
        <View style={styles.logoCircle}>
          <View style={styles.ticketStack}>
            <Text style={styles.ticketMark}>Q</Text>
          </View>
        </View>
        <Text style={styles.brand}>QueueLess</Text>
        <Text style={styles.tagline}>Skip the line. Book your spot.</Text>
      </View>
      <View style={styles.splashFooter}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotMuted]} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotMuted]} />
        </View>
        <Text style={styles.footerText}>Campus Cashier Virtual Queue System</Text>
        <Pressable style={[styles.primaryButton, styles.splashButton]} onPress={() => router.push('/login')}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
