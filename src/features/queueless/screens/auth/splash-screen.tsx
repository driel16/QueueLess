import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, BriefcaseBusiness, Settings } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../../styles';

export default function SplashScreen() {
  return (
    <SafeAreaView style={[styles.splash, styles.splashLanding]}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.splashScroll}
        contentContainerStyle={styles.splashLandingScrollContent}
        showsVerticalScrollIndicator={false}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={styles.splashGradient}>
          <Defs>
            <LinearGradient id="splashBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#244B98" />
              <Stop offset="100%" stopColor="#112653" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#splashBackground)" />
          <Circle cx="96" cy="6" r="27" fill="#6FE0CE" opacity="0.08" />
          <Circle cx="3" cy="95" r="34" fill="#729CF0" opacity="0.08" />
        </Svg>
        <View style={styles.splashTopBar}>
          <View style={styles.splashEyebrow}>
            <View style={styles.splashEyebrowDot} />
            <Text style={styles.splashEyebrowText}>CAMPUS SERVICES</Text>
          </View>
          <View style={styles.splashSettingsButton} accessible={false}>
            <Settings size={19} color="#DCE8FF" strokeWidth={1.8} />
          </View>
        </View>
        <View style={styles.splashCenter}>
          <View style={styles.splashHero}>
            <View style={styles.splashLogo}>
              <BriefcaseBusiness size={38} color="#FFFFFF" strokeWidth={1.7} />
            </View>
            <Text style={styles.brand}>QueueLess</Text>
            <Text style={styles.tagline}>Your time matters.</Text>
          </View>
          <Pressable
            style={styles.splashStartButton}
            onPress={() => router.push('/choose-role')}
            accessibilityRole="button"
            accessibilityLabel="Get started">
            <View style={styles.splashStartButtonCopy}>
              <Text style={styles.splashStartButtonEyebrow}>YOUR CAMPUS, MADE EASIER</Text>
              <Text style={styles.splashStartButtonTitle}>Get started</Text>
              <Text style={styles.splashStartButtonSubtitle}>Choose how you want to continue</Text>
            </View>
            <View style={styles.splashStartButtonArrow}>
              <ArrowRight size={21} color="#0B716E" strokeWidth={2.4} />
            </View>
          </Pressable>
        </View>
        <View style={styles.splashFooter}>
          <View style={styles.splashFooterRule} />
          <Text style={styles.splashFooterText}>Campus Cashier Virtual Queue System</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
