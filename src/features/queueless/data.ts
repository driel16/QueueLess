import type { Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, CalendarDays, Home, LayoutDashboard, ListOrdered, Settings, UserRound } from 'lucide-react-native';

import type { AppRoute, StaffRoute } from './types';

export const services = [
  {
    id: 'tuition-payment',
    title: 'Tuition Payment',
    body: 'Settle semester fees, installment dues, and school matriculation.',
    icon: 'CARD',
  },
  {
    id: 'document-request',
    title: 'Document Request',
    body: 'Request and pay for Transcript of Records, certificates, and diplomas.',
    icon: 'DOC',
  },
  {
    id: 'id-processing',
    title: 'ID Processing',
    body: 'Application for new, replacement, or validated student identification cards.',
    icon: 'ID',
  },
  {
    id: 'scholarship-inquiry',
    title: 'Scholarship Inquiry',
    body: 'Consult with cashier on government grants and academic discounts.',
    icon: 'A+',
  },
  {
    id: 'general-transaction',
    title: 'General Transaction',
    body: 'Over-the-counter payments for miscellaneous laboratory or athletic fees.',
    icon: 'GEN',
  },
];

export const tabs: { key: AppRoute; label: string; icon: LucideIcon; href: Href }[] = [
  { key: 'home', label: 'Home', icon: Home, href: '/home' },
  { key: 'services', label: 'Book', icon: BookOpen, href: '/services' },
  { key: 'queue', label: 'Queue', icon: ListOrdered, href: '/queue' },
  { key: 'profile', label: 'Profile', icon: UserRound, href: '/profile' },
];

export const staffTabs: { key: StaffRoute; label: string; icon: LucideIcon; href: Href }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/cashier-dashboard' },
  { key: 'requests', label: 'Requests', icon: BookOpen, href: '/appointment-requests' },
  { key: 'queue', label: 'Queue', icon: ListOrdered, href: '/active-queue' },
  { key: 'services', label: 'Services', icon: CalendarDays, href: '/service-management' },
  { key: 'settings', label: 'Settings', icon: Settings, href: '/staff-settings' },
];
