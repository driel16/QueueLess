import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MailCheck, Send } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner, Field, KeyboardAvoidingScrollView } from '../../components';
import { getPasswordResetErrorMessage, requestPasswordReset } from '../../auth/auth';
import { useQueuelessPalette } from '../../palette';
import { useQueuelessStyles } from '../../styles';

const signInRoutes = {
  student: '/login',
  staff: '/staff-login',
  admin: '/admin',
} as const;

export default function ForgotPasswordScreen() {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const params = useLocalSearchParams<{ email?: string | string[]; role?: string | string[] }>();
  const role = params.role === 'staff' || params.role === 'admin' ? params.role : 'student';
  const [email, setEmail] = useState(() => (typeof params.email === 'string' ? params.email : ''));
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [requestSent, setRequestSent] = useState(false);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError = submitted
    ? !email.trim()
      ? 'Email is required.'
      : !validEmail
        ? 'Enter a valid email address.'
        : undefined
    : undefined;

  const handleRequestReset = async () => {
    setSubmitted(true);
    setError(undefined);
    if (!validEmail || isLoading) return;

    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setRequestSent(true);
    } catch (resetError) {
      setError(getPasswordResetErrorMessage(resetError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingScrollView
        contentContainerStyle={styles.authContent}
        showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.resetBackButton}
          onPress={() => router.replace(signInRoutes[role])}
          accessibilityRole="button"
          accessibilityLabel="Back to sign in">
          <ArrowLeft size={18} color={palette.blue} />
          <Text style={styles.resetBackText}>Back to sign in</Text>
        </Pressable>
        <View style={styles.loginHero}>
          <View style={styles.resetIcon}>
            {requestSent ? (
              <MailCheck size={32} color={palette.white} />
            ) : (
              <Send size={29} color={palette.white} />
            )}
          </View>
          <Text style={styles.schoolName}>{requestSent ? 'Check your email' : 'Forgot password?'}</Text>
          <Text style={styles.mutedCenter}>
            {requestSent
              ? 'If an account matches that email, you’ll receive a link to reset your password. Check your inbox and spam folder.'
              : 'Enter the email address associated with your account and we’ll send you a reset link.'}
          </Text>
        </View>

        {requestSent ? (
          <View style={styles.loginActions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace(signInRoutes[role])}
              accessibilityRole="button"
              accessibilityLabel="Return to sign in"
              accessibilityHint="Returns to the sign-in screen for your account type">
              <Text style={styles.primaryButtonText}>Return to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.form}>
              {error ? <ErrorBanner message={error} /> : null}
              <Field
                label="Account Email"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                placeholder="name@school.edu"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.loginActions}>
              <Pressable
                style={[styles.primaryButton, (!validEmail || isLoading) && styles.primaryButtonMuted]}
                onPress={() => void handleRequestReset()}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Send reset link"
                accessibilityHint="Sends a password reset link to the entered email address">
                {isLoading ? (
                  <ActivityIndicator color={palette.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send reset link</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingScrollView>
    </SafeAreaView>
  );
}
