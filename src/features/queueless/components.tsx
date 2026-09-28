import { router } from 'expo-router';
import { AlertCircle, ArrowLeft, AtSign, Eye, EyeOff, Inbox, LockKeyhole } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { staffTabs, tabs } from './data';
import { palette } from './palette';
import { styles } from './styles';
import type { AppRoute, StaffRoute } from './types';

export function AppScreen({ children, current }: { children: React.ReactNode; current: AppRoute }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={{ flex: 1 }}>{children}</View>
        <BottomNav current={current} />
      </View>
    </SafeAreaView>
  );
}

export function StaffScreen({ children, current }: { children: React.ReactNode; current: StaffRoute }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={{ flex: 1 }}>{children}</View>
        <StaffBottomNav current={current} />
      </View>
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
          <Text style={styles.fieldError}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <AlertCircle size={18} color={palette.danger} />
      <Text style={styles.errorBannerText}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss error">
          <Text style={styles.errorDismiss}>Dismiss</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
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
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.replace(backTo as never)}>
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
  return (
    <View style={styles.staffHeader}>
      <View style={styles.staffTitleGroup}>
        <Text style={styles.h1}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
      {backTo ? (
        <Pressable style={styles.smallIconButton} onPress={() => router.replace(backTo as never)}>
          <ArrowLeft size={16} color={palette.ink} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: 'warm' | 'green' }) {
  return (
    <View style={[styles.badge, tone === 'green' ? styles.badgeGreen : styles.badgeWarm]}>
      <Text style={[styles.badgeText, tone === 'green' ? styles.badgeGreenText : styles.badgeWarmText]}>
        {label}
      </Text>
    </View>
  );
}

function BottomNav({ current }: { current: AppRoute }) {
  return (
    <View style={styles.bottomBar}>
      {tabs.map((tab) => {
        const active = current === tab.key || (current === 'schedule' && tab.key === 'services');
        const Icon = tab.icon;
        return (
          <Pressable key={tab.key} style={styles.tabItem} onPress={() => router.replace(tab.href)}>
            <Icon size={20} color={active ? palette.green : palette.muted} strokeWidth={2.2} />
            <Text style={[styles.tabLabel, active && styles.tabActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StaffBottomNav({ current }: { current: StaffRoute }) {
  return (
    <View style={styles.bottomBar}>
      {staffTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Pressable key={tab.key} style={styles.tabItem} onPress={() => router.replace(tab.href)}>
            <Icon size={20} color={current === tab.key ? palette.green : palette.muted} strokeWidth={2.2} />
            <Text style={[styles.tabLabel, current === tab.key && styles.tabActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
