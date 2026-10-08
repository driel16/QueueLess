import { router } from 'expo-router';
import { AtSign } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner, Field } from '../../components';
import {
  EmailVerificationRequiredError,
  getAuthErrorMessage,
  resendVerificationEmail,
  signInForRole,
} from '../../auth/auth';
import { useQueuelessPalette } from '../../palette';
import { useQueuelessStyles } from '../../styles';

export default function LoginScreen() {
  const palette = useQueuelessPalette();
  const styles = useQueuelessStyles();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string>();

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError = submitted
    ? !email.trim()
      ? 'Email is required.'
      : !validEmail
        ? 'Enter a valid student email.'
        : undefined
    : undefined;
  const passwordError = submitted && !password ? 'Password is required.' : undefined;
  const canSubmit = Boolean(validEmail && password);

  const handleLogin = async () => {
    setSubmitted(true);
    setAuthError(undefined);
    setVerificationNotice(undefined);
    setRequiresEmailVerification(false);
    if (!validEmail || !password || isLoading) return;

    setIsLoading(true);
    try {
      await signInForRole(email, password, 'student');
      router.push('/home');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'login'));
      setRequiresEmailVerification(error instanceof EmailVerificationRequiredError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!validEmail || !password || isLoading) return;

    setIsLoading(true);
    setAuthError(undefined);
    setVerificationNotice(undefined);
    try {
      const alreadyVerified = await resendVerificationEmail(email, password);
      setVerificationNotice(
        alreadyVerified
          ? 'Your email is already verified. You can log in now.'
          : 'Verification link sent. Check your inbox and spam folder.',
      );
      setRequiresEmailVerification(false);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, 'login'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.authContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.loginHero}>
          <View style={styles.schoolShield}>
            <Text style={styles.schoolShieldText}>QL</Text>
          </View>
          <Text style={styles.schoolName}>QueueLess</Text>
          <Text style={styles.mutedCenter}>Sign in with your campus account</Text>
        </View>
        <View style={styles.form}>
          {authError ? <ErrorBanner message={authError} /> : null}
          {submitted && !canSubmit ? (
            <ErrorBanner message="Please check the highlighted fields and try again." />
          ) : null}
          <Field
            label="Student Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            icon={AtSign}
            placeholder="name@school.edu"
            keyboardType="email-address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secure
            placeholder="Enter your password"
          />
          <Pressable
            style={styles.forgotPasswordLink}
            onPress={() =>
              router.push({ pathname: '/forgot-password', params: { email, role: 'student' } })
            }
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
            accessibilityHint="Opens the password reset flow for your student account">
            <Text style={styles.linkText}>Forgot password?</Text>
          </Pressable>
          {verificationNotice ? <Text style={styles.cardSubtle}>{verificationNotice}</Text> : null}
        </View>
        <View style={styles.loginActions}>
          <Pressable
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonMuted]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Log in to QueueLess"
            accessibilityHint="Signs in with the entered student email and password">
            {isLoading ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Log In</Text>
            )}
          </Pressable>
          {requiresEmailVerification ? (
            <Pressable
              style={styles.roleSwitchButton}
              onPress={handleResendVerification}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Resend verification email"
              accessibilityHint="Sends a fresh verification email to the entered address">
              <Text style={styles.roleSwitchText}>Resend verification email</Text>
            </Pressable>
          ) : null}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>New Student?</Text>
            <View style={styles.divider} />
          </View>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/register')}
            accessibilityRole="button"
            accessibilityLabel="Create a new student account"
            accessibilityHint="Opens the student registration form">
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </Pressable>
          <Pressable
            style={styles.roleSwitchButton}
            onPress={() => router.push('/choose-role')}
            accessibilityRole="button"
            accessibilityLabel="Choose another account type"
            accessibilityHint="Returns to the role selection screen">
            <Text style={styles.roleSwitchText}>Choose another account type</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
