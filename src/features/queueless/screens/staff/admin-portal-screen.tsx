import { router } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { AtSign, Check, RefreshCw, ShieldCheck, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner, Field } from '../../components';
import {
  ADMIN_EMAIL,
  getAuthErrorMessage,
  getStaffApplications,
  reviewStaffApplication,
  signInAsAdmin,
} from '../../auth';
import type { StaffApplication } from '../../auth';
import { styles } from '../../styles';

export default function AdminPortalScreen() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [applications, setApplications] = useState<StaffApplication[]>([]);
  const [authError, setAuthError] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const refreshApplications = async () => {
    setIsLoading(true);
    setActionError(undefined);
    try {
      setApplications(await getStaffApplications());
    } catch (error) {
      setActionError(
        error instanceof FirebaseError
          ? getAuthErrorMessage(error, 'login')
          : error instanceof Error
            ? error.message
            : 'Could not load staff applications.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setAuthError(undefined);
    if (isLoading) return;

    setIsLoading(true);
    try {
      await signInAsAdmin(email, password);
      setPassword('');
      setIsAdmin(true);
      await refreshApplications();
    } catch (error) {
      setAuthError(
        error instanceof FirebaseError
          ? getAuthErrorMessage(error, 'login')
          : error instanceof Error
            ? error.message
            : 'Could not sign in to the admin portal.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (application: StaffApplication, decision: 'approved' | 'rejected') => {
    setActionError(undefined);
    setIsLoading(true);
    try {
      await reviewStaffApplication(application.uid, decision);
      setApplications((current) => current.filter((item) => item.uid !== application.uid));
    } catch (error) {
      setActionError(
        error instanceof FirebaseError
          ? getAuthErrorMessage(error, 'login')
          : error instanceof Error
            ? error.message
            : 'Could not review this staff application.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.adminPortalHeader}>
          <View style={styles.adminPortalIcon}>
            <ShieldCheck size={25} color="#FFFFFF" />
          </View>
          <Text style={styles.h1}>Staff Applications</Text>
          <Text style={styles.mutedCenter}>
            {isAdmin ? 'Review requests for staff portal access.' : 'Administrator sign in required.'}
          </Text>
        </View>

        {isAdmin ? (
          <>
            {actionError ? <ErrorBanner message={actionError} /> : null}
            <View style={styles.adminToolbar}>
              <Text style={styles.sectionTitle}>Pending ({applications.length})</Text>
              <Pressable
                style={styles.adminRefreshButton}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Refresh staff applications"
                onPress={() => void refreshApplications()}>
                {isLoading ? (
                  <ActivityIndicator color="#203F91" />
                ) : (
                  <RefreshCw size={17} color="#203F91" />
                )}
              </Pressable>
            </View>
            {!isLoading && applications.length === 0 ? (
              <View style={styles.staffApplicationNotice}>
                <Text style={styles.staffApplicationNoticeTitle}>You’re all caught up</Text>
                <Text style={styles.staffApplicationNoticeText}>
                  New staff access requests will appear here.
                </Text>
              </View>
            ) : null}
            {applications.map((application) => (
              <View key={application.uid} style={styles.adminApplicationCard}>
                <Text style={styles.adminApplicantName}>{application.displayName}</Text>
                <Text style={styles.adminApplicantEmail}>{application.email}</Text>
                <Text style={styles.adminApplicantDate}>
                  {application.createdAt
                    ? `Applied ${application.createdAt.toLocaleDateString()}`
                    : 'Application date unavailable'}
                </Text>
                <View style={styles.adminApplicationActions}>
                  <Pressable
                    style={styles.adminApproveButton}
                    disabled={isLoading}
                    accessibilityRole="button"
                    onPress={() => void handleReview(application, 'approved')}>
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    <Text style={styles.adminActionText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={styles.adminRejectButton}
                    disabled={isLoading}
                    accessibilityRole="button"
                    onPress={() => void handleReview(application, 'rejected')}>
                    <X size={16} color="#D74C5C" strokeWidth={2.5} />
                    <Text style={styles.adminRejectText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.form}>
            {authError ? <ErrorBanner message={authError} /> : null}
            <Field
              label="Administrator Email"
              value={email}
              onChangeText={setEmail}
              icon={AtSign}
              placeholder={ADMIN_EMAIL}
              keyboardType="email-address"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secure
              placeholder="Enter your password"
            />
            <Pressable
              style={styles.forgotPasswordLink}
              onPress={() =>
                router.push({ pathname: '/forgot-password', params: { email, role: 'admin' } })
              }
              accessibilityRole="link">
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              disabled={isLoading}
              accessibilityRole="button"
              onPress={() => void handleSignIn()}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In as Admin</Text>
              )}
            </Pressable>
          </View>
        )}

        <Pressable
          style={styles.roleSwitchButton}
          onPress={() => router.replace('/staff-login')}
          accessibilityRole="button">
          <Text style={styles.roleSwitchText}>Back to Staff Sign In</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
