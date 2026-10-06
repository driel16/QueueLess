import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, GraduationCap } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useQueuelessPalette } from '../../palette';
import { useQueuelessStyles } from '../../styles';

export default function ChooseRoleScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  return (
    <SafeAreaView style={styles.splash}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.splashScroll}
        contentContainerStyle={styles.splashScrollContent}
        showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.chooseRoleBackButton}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Back to welcome screen">
          <ArrowLeft size={19} color={palette.white} />
          <Text style={styles.chooseRoleBackText}>Back</Text>
        </Pressable>
        <View style={styles.chooseRoleContent}>
          <View style={styles.chooseRoleHero}>
            <Text style={styles.chooseRoleEyebrow}>WELCOME TO QUEUELESS</Text>
            <Text style={styles.chooseRoleTitle}>How will you use QueueLess?</Text>
            <Text style={styles.chooseRoleSubtitle}>
              Choose the account type that best describes you.
            </Text>
          </View>
          <Pressable
            style={[styles.roleCard, styles.roleCardStudent]}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel="Continue as a student">
            <View style={[styles.roleIcon, styles.roleIconOnSplash]}>
              <GraduationCap size={26} color={palette.splashBlue} />
            </View>
            <View style={styles.roleCardCopy}>
              <Text style={[styles.roleCardTitle, styles.roleCardTitleStudent]}>I’m a student</Text>
              <Text style={[styles.roleCardSubtitle, styles.roleCardSubtitleStudent]}>
                Book and manage your campus visits
              </Text>
            </View>
            <ArrowRight size={22} color={palette.splashBlue} />
          </Pressable>
          <Pressable
            style={styles.roleCard}
            onPress={() => router.push('/staff-login')}
            accessibilityRole="button"
            accessibilityLabel="Continue as staff">
            <View style={[styles.roleIcon, styles.roleIconStaffOnSplash]}>
              <BriefcaseBusiness size={24} color={palette.white} />
            </View>
            <View style={styles.roleCardCopy}>
              <Text style={[styles.roleCardTitle, styles.roleCardTitleStaff]}>I’m staff</Text>
              <Text style={[styles.roleCardSubtitle, styles.roleCardSubtitleStaff]}>
                Manage requests and the live queue
              </Text>
            </View>
            <ArrowRight size={22} color={palette.white} />
          </Pressable>
          <View style={styles.splashTrustRow}>
            <View style={styles.splashTrustDot} />
            <Text style={styles.splashTrustText}>A faster campus service experience</Text>
          </View>
        </View>
        <View style={styles.splashFooter}>
          <Text style={styles.footerText}>Campus Cashier Virtual Queue System</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
