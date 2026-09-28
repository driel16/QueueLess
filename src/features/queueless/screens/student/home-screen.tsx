import { router } from 'expo-router';
import { Plus, Ticket } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen, EmptyState, ErrorBanner } from '../../components';
import { getCurrentStudentProfile } from '../../auth';
import type { StudentProfile } from '../../auth';
import { styles } from '../../styles';

export default function HomeScreen() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    getCurrentStudentProfile()
      .then((currentProfile) => {
        if (isMounted) setProfile(currentProfile);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setProfileError(
            error instanceof Error ? error.message : 'Could not load your account details.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const initials =
    profile?.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'Q';

  return (
    <AppScreen current="home">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.profileLoading}>
            <ActivityIndicator color="#0F8F8B" />
            <Text style={styles.cardSubtle}>Loading your account...</Text>
          </View>
        ) : (
          <View style={styles.homeWelcomeCard}>
            <View style={styles.homeWelcomeCopy}>
              <Text style={styles.homeWelcomeEyebrow}>Welcome to QueueLess</Text>
              <Text style={styles.homeWelcomeTitle}>{profile?.displayName ?? 'Student'}</Text>
              <Text style={styles.homeWelcomeSubtitle}>
                {profile?.studentNumber ? `Student ID · ${profile.studentNumber}` : 'Your student dashboard'}
              </Text>
            </View>
            <View style={styles.homeWelcomeAvatar}>
              <Text style={styles.homeWelcomeAvatarText}>{initials}</Text>
            </View>
          </View>
        )}
        {profileError ? <ErrorBanner message={profileError} /> : null}
        <EmptyState
          title="No upcoming appointments"
          message="Your booked cashier visits will appear here."
        />

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
        <EmptyState title="No activity yet" message="Your completed appointments will appear here." />
      </ScrollView>
    </AppScreen>
  );
}
