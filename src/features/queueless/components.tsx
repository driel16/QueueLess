import { router, usePathname } from 'expo-router';
import { AlertCircle, ArrowLeft, AtSign, Eye, EyeOff, Inbox, LockKeyhole } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createAppointmentQrPayload } from './appointments/appointment-qr';
import { confirmStudentTransactionFinished } from './appointments/appointment-requests';
import type { AppointmentRequest } from './appointments/appointment-requests';
import { palette as fixedPalette, qrCodePalette, useQueuelessPalette } from './palette';
import { formatLocalDate } from './schedule/schedule-utils';
import { useQueuelessStyles } from './styles';

const studentTabRoutes = new Set(['/home', '/services', '/queue', '/profile']);
const staffTabRoutes = new Set([
  '/cashier-dashboard',
  '/appointment-requests',
  '/active-queue',
  '/service-management',
  '/staff-settings',
]);

export function AppScreen({ children }: { children: React.ReactNode }) {
  const styles = useQueuelessStyles();
  const pathname = usePathname();
  const edges = studentTabRoutes.has(pathname) ? ['top'] as const : ['top', 'bottom'] as const;

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={styles.screen}>{children}</View>
    </SafeAreaView>
  );
}

export function StaffScreen({ children }: { children: React.ReactNode }) {
  const styles = useQueuelessStyles();
  const pathname = usePathname();
  const edges = staffTabRoutes.has(pathname) ? ['top'] as const : ['top', 'bottom'] as const;

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={styles.screen}>{children}</View>
    </SafeAreaView>
  );
}

export function Field({
  label,
  value,
  secure = false,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
  icon,
}: {
  label: string;
  value: string;
  secure?: boolean;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  icon?: LucideIcon;
}) {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const Icon = icon ?? (secure ? LockKeyhole : AtSign);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, focused && styles.inputShellFocused, error && styles.inputShellError]}>
        <Icon size={17} color={error ? palette.danger : focused ? palette.greenDark : palette.muted} />
        <TextInput
          editable={onChangeText !== undefined}
          secureTextEntry={secure && !showPassword}
          style={styles.input}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          accessibilityHint={error}
          accessibilityState={{ disabled: onChangeText === undefined }}
          placeholderTextColor={palette.placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          selectionColor={palette.greenDark}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secure ? (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={16} color={palette.muted} /> : <Eye size={16} color={palette.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.fieldErrorRow}>
          <AlertCircle size={14} color={palette.danger} />
          <Text style={styles.fieldError} accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <AlertCircle size={18} color={palette.danger} />
      <Text style={styles.errorBannerText}>{message}</Text>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error">
          <Text style={styles.errorDismiss}>Dismiss</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Inbox size={22} color={palette.greenDark} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateMessage}>{message}</Text>
    </View>
  );
}

export function Header({ title, subtitle, backTo }: { title: string; subtitle: string; backTo: string }) {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  return (
    <View style={styles.header}>
      <Pressable
        style={styles.backButton}
        onPress={() => router.replace(backTo as never)}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <ArrowLeft size={18} color={palette.ink} strokeWidth={2.5} />
      </Pressable>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function StaffHeader({ title, subtitle, backTo }: { title: string; subtitle: string; backTo?: string }) {
  const styles = useQueuelessStyles();
  const palette = useQueuelessPalette();

  return (
    <View style={styles.staffHeader}>
      <View style={styles.staffTitleGroup}>
        <Text style={styles.h1}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
      {backTo ? (
        <Pressable
          style={styles.smallIconButton}
          onPress={() => router.replace(backTo as never)}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={16} color={palette.ink} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: 'warm' | 'green' }) {
  const styles = useQueuelessStyles();

  return (
    <View style={[styles.badge, tone === 'green' ? styles.badgeGreen : styles.badgeWarm]}>
      <Text style={[styles.badgeText, tone === 'green' ? styles.badgeGreenText : styles.badgeWarmText]}>
        {label}
      </Text>
    </View>
  );
}

export function QueueProgress({ step }: { step: number }) {
  const styles = useQueuelessStyles();

  const steps = ['Requested', 'Approved', 'Checked in', 'Being served'];

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: steps.length - 1, now: step }}
      accessibilityLabel={`Queue progress: ${steps[step]}`}>
      <View style={styles.queueProgressTrack}>
        <View style={styles.queueProgressRail} />
        <View
          style={[
            styles.queueProgressRail,
            styles.queueProgressRailActive,
            { width: `${(step / (steps.length - 1)) * 100}%` },
          ]}
        />
        <View style={styles.queueProgressDots}>
          {steps.map((label, index) => (
            <View
              key={label}
              style={[
                styles.queueProgressDot,
                index <= step ? styles.queueProgressDotActive : null,
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.queueProgressLabels}>
        {steps.map((label, index) => (
          <Text
            key={label}
            style={[
              styles.queueProgressLabel,
              index === step ? styles.queueProgressLabelActive : null,
            ]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function AppointmentQueueSummary({ request }: { request: AppointmentRequest }) {
  const styles = useQueuelessStyles();

  const [isConfirmingFinished, setIsConfirmingFinished] = useState(false);
  const [finishError, setFinishError] = useState<string>();
  const progressStep = request.status === 'serving' ? 3 : request.arrivedAt ? 2 : 1;

  return (
    <View style={styles.appointmentQueueSummary}>
      <View style={styles.rowBetween}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Badge
          label={
            request.status === 'serving'
              ? 'Now Serving'
              : request.arrivedAt
                ? 'Checked in'
                : 'Approved'
          }
          tone="green"
        />
      </View>
      <Text style={styles.appointmentQueueTitle}>
        {request.status === 'serving'
          ? 'You are being served'
          : request.arrivedAt
            ? 'You are checked in'
            : 'Appointment approved'}
      </Text>
      <Text style={styles.itemSubtle}>{request.service} · {request.date}</Text>
      <QueueProgress step={progressStep} />
      {request.status === 'approved' && !request.arrivedAt ? (
        <Text style={styles.queueActionHint}>
          Your appointment is approved. Show your QR code to the cashier when you arrive to check in.
        </Text>
      ) : null}
      {request.arrivedAt ? (
        <Text style={styles.itemSubtle}>
          Checked in at {request.arrivedAt.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      ) : null}
      {request.status === 'approved' && request.arrivedAt ? (
        <Text style={styles.queueActionHint}>
          {request.nextAt && request.date === formatLocalDate(new Date())
            ? `You’re next! Please stay near the cashier. The cashier will call you shortly.`
            : request.date > formatLocalDate(new Date())
              ? `You’re checked in early for your ${request.date} appointment. The cashier can call you on that date.`
              : `You’re checked in. Wait nearby; the cashier will call your queue number.`}
        </Text>
      ) : null}
      <View style={styles.appointmentQueueMetrics}>
        <View style={styles.appointmentQueueMetric}>
          <Text style={styles.appointmentQueueMetricLabel}>Queue number</Text>
          <Text style={styles.appointmentQueueMetricValue}>
            {request.queueNumber
              ? `Q-${String(request.queueNumber).padStart(3, '0')}`
              : 'Generating ticket…'}
          </Text>
        </View>
        <View style={styles.appointmentQueueMetric}>
          <Text style={styles.appointmentQueueMetricLabel}>Students ahead</Text>
          <Text style={styles.appointmentQueueMetricValue}>
            {typeof request.queueNumber === 'number' ? request.studentsAhead ?? '—' : '—'}
          </Text>
        </View>
      </View>
      <Text style={styles.itemSubtle}>
        {typeof request.queueNumber === 'number'
          ? typeof request.estimatedWaitMinutes === 'number'
            ? `Estimated wait: about ${request.estimatedWaitMinutes} min`
            : 'Your queue position is ready.'
          : 'Your queue ticket is being prepared automatically.'}
      </Text>
      {request.status === 'serving' ? (
        request.studentFinishedAt ? (
          <Text style={styles.queueActionHint}>
            You confirmed the transaction is finished. Waiting for the cashier to confirm.
          </Text>
        ) : (
          <>
            <Text style={styles.itemSubtle}>
              After the cashier has finished helping you, confirm the transaction below.
            </Text>
            {finishError ? <ErrorBanner message={finishError} /> : null}
            <Pressable
              style={styles.primaryButton}
              disabled={isConfirmingFinished}
              accessibilityRole="button"
              onPress={async () => {
                setIsConfirmingFinished(true);
                setFinishError(undefined);
                try {
                  await confirmStudentTransactionFinished(request.id);
                } catch (error) {
                  setFinishError(
                    error instanceof Error
                      ? error.message
                      : 'Could not confirm that the transaction is finished.',
                  );
                } finally {
                  setIsConfirmingFinished(false);
                }
              }}>
              {isConfirmingFinished ? (
                <ActivityIndicator color={fixedPalette.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Confirm Transaction Finished</Text>
              )}
            </Pressable>
          </>
        )
      ) : null}
    </View>
  );
}

export function AppointmentQrTicket({ request }: { request: AppointmentRequest }) {
  const styles = useQueuelessStyles();

  if (request.status !== 'approved' || request.arrivedAt) return null;

  return (
    <View style={styles.appointmentQrCard}>
      <Text style={styles.appointmentQueueTitle}>Cashier check-in QR</Text>
      <Text style={styles.itemSubtle}>
        Show this code to the cashier to verify your appointment and check in.
      </Text>
      <QRCode
        value={createAppointmentQrPayload(request.id)}
        size={200}
        color={qrCodePalette.ink}
        backgroundColor={qrCodePalette.paper}
        ecl="M"
      />
      <Text style={styles.itemSubtle}>Appointment ID: {request.id}</Text>
    </View>
  );
}
