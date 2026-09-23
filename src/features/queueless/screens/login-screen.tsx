import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner, Field } from '../components';
import { styles } from '../styles';

export default function LoginScreen() {
  const [email, setEmail] = useState('maria.santos@student.su.edu');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted ? (!email.trim() ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Enter a valid student email.' : undefined) : undefined;
  const passwordError = submitted && !password ? 'Password is required.' : undefined;
  const canSubmit = Boolean(!emailError && !passwordError && email.trim() && password);

  const handleLogin = () => {
    setSubmitted(true);
    if (!email.trim() || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    router.push('/home');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.loginHero}>
        <View style={styles.schoolShield}>
          <Text style={styles.schoolShieldText}>SU</Text>
        </View>
        <Text style={styles.schoolName}>State University</Text>
        <Text style={styles.mutedCenter}>Sign in with your student portal account</Text>
      </View>
      <View style={styles.form}>
        {submitted && (!email.trim() || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? (
          <ErrorBanner message="Please check the highlighted fields and try again." />
        ) : null}
        <Field label="Student Email" value={email} onChangeText={setEmail} error={emailError} placeholder="student@school.edu" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} error={passwordError} secure placeholder="Enter your password" />
        <Text style={styles.linkText}>Forgot Password?</Text>
      </View>
      <View style={styles.loginActions}>
        <Pressable style={[styles.primaryButton, !canSubmit && styles.primaryButtonMuted]} onPress={handleLogin} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Log In</Text>
        </Pressable>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>New Student?</Text>
          <View style={styles.divider} />
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/register')}>
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/staff-login')}>
          <Text style={styles.secondaryButtonText}>Staff Portal</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
