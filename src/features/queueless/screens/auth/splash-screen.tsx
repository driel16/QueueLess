import { router } from 'expo-router';
import { ArrowRight, BriefcaseBusiness, GraduationCap } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '../../palette';
import { styles } from '../../styles';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.splash}>
      <StatusBar style="light" />
      <View style={styles.splashCenter}>
        <View style={styles.splashLogo}>
          <BriefcaseBusiness size={50} color="#FFFFFF" strokeWidth={1.5} />
        </View>
        <Text style={styles.brand}>QueueLess</Text>
        <Text style={styles.tagline}>Skip the line. Book your spot.</Text>
        <View style={styles.rolePrompt}>
          <Text style={styles.rolePromptTitle}>How will you use QueueLess?</Text>
          <Text style={styles.rolePromptSubtitle}>Choose your account type to continue.</Text>
        </View>
        <Pressable
          style={[styles.roleCard, styles.roleCardStudent]}
          onPress={() => router.push('/login')}
          accessibilityRole="button"
          accessibilityLabel="Continue as a student">
          <View style={[styles.roleIcon, styles.roleIconOnSplash]}>
            <GraduationCap size={22} color={palette.splashBlue} />
          </View>
          <View style={styles.roleCardCopy}>
            <Text style={[styles.roleCardTitle, styles.roleCardTitleStudent]}>I’m a student</Text>
            <Text style={[styles.roleCardSubtitle, styles.roleCardSubtitleStudent]}>
              Book and manage your visits
            </Text>
          </View>
          <ArrowRight size={20} color={palette.splashBlue} />
        </Pressable>
        <Pressable
          style={styles.roleCard}
          onPress={() => router.push('/staff-login')}
          accessibilityRole="button"
          accessibilityLabel="Continue as staff">
          <View style={[styles.roleIcon, styles.roleIconStaffOnSplash]}>
            <BriefcaseBusiness size={20} color="#FFFFFF" />
          </View>
          <View style={styles.roleCardCopy}>
            <Text style={[styles.roleCardTitle, styles.roleCardTitleStaff]}>I’m staff</Text>
            <Text style={[styles.roleCardSubtitle, styles.roleCardSubtitleStaff]}>
              Manage requests and the queue
            </Text>
          </View>
          <ArrowRight size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.splashFooter}>
        <Text style={styles.footerText}>Campus Cashier Virtual Queue System</Text>
      </View>
    </SafeAreaView>
  );
}
