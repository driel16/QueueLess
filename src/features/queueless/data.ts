import type { Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, Home, LayoutDashboard, ListOrdered, Settings, UserRound } from 'lucide-react-native';

import type { AppRoute, StaffRoute } from './types';

export const services = [
  {
    title: 'Tuition Payment',
    body: 'Settle semester fees, installment dues, and school matriculation.',
    icon: 'CARD',
  },
  {
    title: 'Document Request',
    body: 'Request and pay for Transcript of Records, certificates, and diplomas.',
    icon: 'DOC',
  },
  {
    title: 'ID Processing',
    body: 'Application for new, replacement, or validated student identification cards.',
    icon: 'ID',
  },
  {
    title: 'Scholarship Inquiry',
    body: 'Consult with cashier on government grants and academic discounts.',
    icon: 'A+',
  },
  {
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
  { key: 'settings', label: 'Settings', icon: Settings, href: '/service-management' },
];

export const appointmentRequests = [
  { ticket: 'A025', name: 'Maria Santos', service: 'Tuition Payment', time: '10:00 AM', status: 'Pending' },
  { ticket: 'A026', name: 'Carlos Tan', service: 'Document Request', time: '10:30 AM', status: 'Pending' },
  { ticket: 'A027', name: 'Ana Reyes', service: 'ID Processing', time: '1:30 PM', status: 'Approved' },
];

export const activeQueue = [
  { ticket: 'A021', name: 'Nina Cruz', service: 'Tuition Payment', status: 'Serving' },
  { ticket: 'A022', name: 'David Lim', service: 'Tuition Payment', status: 'Waiting' },
  { ticket: 'A023', name: 'Ana Reyes', service: 'ID Processing', status: 'Waiting' },
  { ticket: 'A024', name: 'Carlos Tan', service: 'Document Request', status: 'Waiting' },
  { ticket: 'A025', name: 'Maria Santos', service: 'Tuition Payment', status: 'Waiting' },
];

export const staffMembers = [
  { initials: 'RG', name: 'Rosa Garcia', role: 'Admin', status: 'Active' },
  { initials: 'MR', name: 'Mark Reyes', role: 'Staff', status: 'Active' },
  { initials: 'LC', name: 'Lisa Cruz', role: 'Staff', status: 'Offline' },
];
