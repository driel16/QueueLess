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
    <SafeAreaView style={styles.roleSelectionScreen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.splashScroll}
        contentContainerStyle={styles.roleSelectionScrollContent}
        showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.roleSelectionBackButton}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Back to welcome screen">
          <ArrowLeft size={19} color={palette.roleSelectionText} />
          <Text style={styles.roleSelectionBackText}>Back</Text>
        </Pressable>
        <View style={styles.roleSelectionBody}>
          <View style={styles.roleSelectionBrand}>
            <View style={styles.roleSelectionLogo}>
              <BriefcaseBusiness size={58} color={palette.white} strokeWidth={1.8} />
            </View>
            <Text style={styles.roleSelectionBrandTitle}>QueueLess</Text>
            <Text style={styles.roleSelectionTagline}>Skip the line. Book your spot.</Text>
          </View>
          <View style={styles.roleSelectionPrompt}>
            <Text style={styles.roleSelectionTitle}>How will you use QueueLess?</Text>
            <Text style={styles.roleSelectionSubtitle}>
              Choose your account type to continue.
            </Text>
          </View>
          <View style={styles.roleSelectionCards}>
            <Pressable
              style={[styles.roleSelectionCard, styles.roleSelectionStudentCard]}
              onPress={() => router.push('/login')}
              accessibilityRole="button"
              accessibilityLabel="Continue as a student">
              <View style={[styles.roleSelectionIcon, styles.roleSelectionStudentIcon]}>
                <GraduationCap size={29} color={palette.splashBlue} strokeWidth={2.2} />
              </View>
              <View style={styles.roleSelectionCardCopy}>
                <Text style={styles.roleSelectionStudentTitle}>I’m a student</Text>
                <Text style={styles.roleSelectionStudentSubtitle}>
                  Book and manage your visits
                </Text>
              </View>
              <ArrowRight size={23} color={palette.splashBlue} strokeWidth={2.4} />
            </Pressable>
            <Pressable
              style={[styles.roleSelectionCard, styles.roleSelectionStaffCard]}
              onPress={() => router.push('/staff-login')}
              accessibilityRole="button"
              accessibilityLabel="Continue as staff">
              <View style={[styles.roleSelectionIcon, styles.roleSelectionStaffIcon]}>
                <BriefcaseBusiness size={27} color={palette.white} strokeWidth={2} />
              </View>
              <View style={styles.roleSelectionCardCopy}>
                <Text style={styles.roleSelectionStaffTitle}>I’m staff</Text>
                <Text style={styles.roleSelectionStaffSubtitle}>
                  Manage requests and the queue
                </Text>
              </View>
              <ArrowRight size={23} color={palette.white} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
        <View style={styles.roleSelectionFooter}>
          <Text style={styles.roleSelectionFooterText}>Campus Cashier Virtual Queue System</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
