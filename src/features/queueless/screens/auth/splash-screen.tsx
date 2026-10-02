import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../../brand-mark';
import { ADMIN_EMAIL } from '../../auth';
import { ErrorBanner } from '../../components';
import { styles } from '../../styles';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';

export default function SplashScreen() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [sessionError, setSessionError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(
      getFirebaseAuth(),
      async (user) => {
        if (!isMounted) return;
        if (!user) {
          setIsRestoringSession(false);
          return;
        }

        try {
          if (!user.emailVerified) {
            throw new Error('Your saved session is not verified. Sign in after verifying your email.');
          }
          if (user.email?.toLowerCase() === ADMIN_EMAIL) {
            router.replace('/admin');
            return;
          }

          const profile = await getDoc(doc(getFirebaseFirestore(), 'users', user.uid));
          if (!profile.exists()) {
            throw new Error('Your account profile could not be found. Please contact support.');
          }
          const role = profile.data().role;
          if (role === 'student') {
            router.replace('/home');
          } else if (role === 'staff') {
            router.replace('/cashier-dashboard');
          } else {
            throw new Error('Your account does not have an available QueueLess role.');
          }
        } catch (error) {
          if (isMounted) {
            setSessionError(
              error instanceof Error ? error.message : 'Could not restore your saved sign-in.',
            );
            setIsRestoringSession(false);
          }
        }
      },
      (error) => {
        if (isMounted) {
          setSessionError(error.message);
          setIsRestoringSession(false);
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (isRestoringSession) {
    return (
      <SafeAreaView style={[styles.splash, styles.splashLanding]}>
        <StatusBar style="light" />
        <View style={styles.splashRestore}>
          <View style={styles.splashLogo}>
            <BrandMark />
          </View>
          <Text style={styles.brand}>QueueLess</Text>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.splash, styles.splashLanding]}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.splashScroll}
        contentContainerStyle={styles.splashLandingScrollContent}
        showsVerticalScrollIndicator={false}>
        {sessionError ? <ErrorBanner message={sessionError} /> : null}
        <View style={styles.splashCenter}>
          <View style={styles.splashHero}>
            <Animated.View entering={FadeInDown.duration(650)} style={styles.splashLogo}>
              <BrandMark />
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(100).duration(550)} style={styles.splashHeroCopy}>
              <Text style={styles.brand}>QueueLess</Text>
              <Text style={styles.tagline}>Your time matters.</Text>
            </Animated.View>
          </View>
          <Pressable
            style={[styles.splashStartButton, styles.splashStartButtonLower]}
            onPress={() => router.push('/choose-role')}
            accessibilityRole="button"
            accessibilityLabel="Get started">
            <Animated.View
              entering={FadeInUp.delay(220).duration(550)}
              style={styles.splashStartButtonContent}>
              <View style={styles.splashStartButtonCopy}>
                <Text style={styles.splashStartButtonEyebrow}>YOUR CAMPUS, MADE EASIER</Text>
                <Text style={styles.splashStartButtonTitle}>Get started</Text>
                <Text style={styles.splashStartButtonSubtitle}>Choose how you want to continue</Text>
              </View>
              <View style={styles.splashStartButtonArrow}>
                <ArrowRight size={21} color="#0B716E" strokeWidth={2.4} />
              </View>
            </Animated.View>
          </Pressable>
        </View>
        <Animated.View entering={FadeInUp.delay(320).duration(500)} style={styles.splashFooter}>
          <View style={styles.splashFooterRule} />
          <Text style={styles.splashFooterText}>Campus Cashier Virtual Queue System</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
