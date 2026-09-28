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
} from '../../auth';
import { styles } from '../../styles';

export default function LoginScreen() {
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
      router.replace('/home');
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
            <Text style={styles.schoolShieldText}>SU</Text>
          </View>
          <Text style={styles.schoolName}>State University</Text>
          <Text style={styles.mutedCenter}>Sign in with your student portal account</Text>
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
          <Text style={styles.linkText}>Use your student portal password</Text>
          {verificationNotice ? <Text style={styles.cardSubtle}>{verificationNotice}</Text> : null}
        </View>
        <View style={styles.loginActions}>
          <Pressable
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonMuted]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button">
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Log In</Text>
            )}
          </Pressable>
          {requiresEmailVerification ? (
            <Pressable
              style={styles.roleSwitchButton}
              onPress={handleResendVerification}
              disabled={isLoading}
              accessibilityRole="button">
              <Text style={styles.roleSwitchText}>Resend verification email</Text>
            </Pressable>
          ) : null}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>New Student?</Text>
            <View style={styles.divider} />
          </View>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/register')}>
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </Pressable>
          <Pressable
            style={styles.roleSwitchButton}
            onPress={() => router.replace('/')}>
            <Text style={styles.roleSwitchText}>Not a student? Choose another account type</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
