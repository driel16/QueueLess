import { router } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { AtSign, BadgeCheck, CircleAlert, LockKeyhole, LogOut, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen, ErrorBanner, Field } from '../../components';
import {
  deleteCurrentStudentAccount,
  getAuthErrorMessage,
  getCurrentStudentProfile,
  signOutCurrentUser,
} from '../../auth';
import type { StudentProfile } from '../../auth';
import { useQueuelessPalette } from '../../palette';
import { useQueuelessStyles } from '../../styles';

export default function ProfileScreen() {
  const palette = useQueuelessPalette();
  const styles = useQueuelessStyles();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleteFormOpen, setIsDeleteFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string>();
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
    <AppScreen current="profile">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.h1}>{profile?.displayName ?? 'Your Profile'}</Text>
          <Text style={styles.mutedCenter}>Student account</Text>
          {profile ? (
            <View
              style={[
                styles.profileVerificationBadge,
                !profile.emailVerified && styles.profileVerificationBadgePending,
              ]}>
              {profile.emailVerified ? (
                <BadgeCheck size={16} color={palette.greenDark} strokeWidth={2.5} />
              ) : (
                <CircleAlert size={16} color={palette.amber} strokeWidth={2.5} />
              )}
              <Text
                style={[
                  styles.profileVerificationText,
                  !profile.emailVerified && styles.profileVerificationTextPending,
                ]}>
                {profile.emailVerified ? 'Email verified' : 'Email not verified'}
              </Text>
            </View>
          ) : null}
        </View>
        {profileError ? <ErrorBanner message={profileError} /> : null}
        {isLoading ? (
          <View style={styles.profileLoading}>
            <ActivityIndicator color={palette.greenDark} />
            <Text style={styles.cardSubtle}>Loading your profile...</Text>
          </View>
        ) : profile ? (
          <View style={styles.profileDetails}>
            {[
              ['Name', profile.displayName],
              ['Student ID', profile.studentNumber || 'Not provided'],
              ['Email', profile.email || 'Not provided'],
              ['Account type', 'Student'],
            ].map(([label, value]) => (
              <View key={label} style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>{label}</Text>
                <Text style={styles.profileDetailValue}>{value}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {([
          ['My Appointments', '/my-appointments'],
          ['Queue History', '/queue-history'],
          ['Notifications', '/notifications'],
        ] as const).map(([label, href]) => (
          <Pressable key={label} style={styles.compactCard} onPress={() => router.push(href)}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{label}</Text>
              <Text style={styles.chevron}>{'>'}</Text>
            </View>
          </Pressable>
        ))}
        {isDeleteFormOpen ? (
          <View style={styles.deleteAccountCard}>
            <Text style={styles.deleteAccountTitle}>Confirm account deletion</Text>
            <Text style={styles.deleteAccountMessage}>
              This permanently deletes your QueueLess sign-in and student profile. Enter your account
              email and password to confirm.
            </Text>
            {deleteError ? <ErrorBanner message={deleteError} /> : null}
            <Field
              label="Confirm account email"
              value={deleteConfirmationEmail}
              onChangeText={setDeleteConfirmationEmail}
              icon={AtSign}
              placeholder={profile?.email ?? 'Your account email'}
              keyboardType="email-address"
            />
            <Field
              label="Current password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              icon={LockKeyhole}
              secure
              placeholder="Re-enter your password"
            />
            <Pressable
              style={styles.deleteAccountButton}
              disabled={isDeleting}
              accessibilityRole="button"
              onPress={async () => {
                if (isDeleting) return;
                setDeleteError(undefined);
                setIsDeleting(true);
                try {
                  await deleteCurrentStudentAccount(deleteConfirmationEmail, deletePassword);
                  router.replace('/login');
                } catch (error) {
                  setDeleteError(
                    error instanceof FirebaseError
                      ? error.code === 'permission-denied'
                        ? 'Firestore rejected the profile deletion. Publish the current firestore.rules to the same Firebase project, including "allow delete: if isVerifiedOwner(userId);", then sign out and back in before trying again.'
                        : getAuthErrorMessage(error, 'login')
                      : error instanceof Error
                        ? error.message
                        : 'Could not delete your account. Please try again.',
                  );
                } finally {
                  setIsDeleting(false);
                }
              }}>
              {isDeleting ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <>
                  <Trash2 size={17} color={palette.white} />
                  <Text style={styles.deleteAccountButtonText}>Permanently delete account</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={styles.deleteAccountCancel}
              disabled={isDeleting}
              onPress={() => {
                setIsDeleteFormOpen(false);
                setDeleteConfirmationEmail('');
                setDeletePassword('');
                setDeleteError(undefined);
              }}>
              <Text style={styles.deleteAccountCancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.deleteAccountLink}
            accessibilityRole="button"
            onPress={() => {
              setDeleteError(undefined);
              setIsDeleteFormOpen(true);
            }}>
            <Trash2 size={16} color={palette.danger} />
            <Text style={styles.deleteAccountLinkText}>Delete account</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.signOutButton}
          disabled={isSigningOut}
          accessibilityRole="button"
          onPress={async () => {
            setProfileError(undefined);
            setIsSigningOut(true);
            try {
              await signOutCurrentUser();
              router.replace('/login');
            } catch (error) {
              setProfileError(
                error instanceof Error ? error.message : 'Could not sign out. Please try again.',
              );
            } finally {
              setIsSigningOut(false);
            }
          }}>
          {isSigningOut ? (
            <ActivityIndicator color={palette.danger} />
          ) : (
            <>
              <LogOut size={18} color={palette.danger} />
              <Text style={styles.signOutButtonText}>Log Out</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}
