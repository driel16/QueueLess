import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import {
  BookOpen,
  CalendarDays,
  Home,
  LayoutDashboard,
  ListOrdered,
  Settings,
  UserRound,
} from 'lucide-react-native';

import { useQueuelessPalette } from '../palette';

const expandedWidth = 768;

function useAdaptiveTabOptions() {
  const { width } = useWindowDimensions();
  const palette = useQueuelessPalette();
  const expanded = width >= expandedWidth;

  return {
    headerShown: false,
    tabBarPosition: expanded ? ('left' as const) : ('bottom' as const),
    tabBarVariant: expanded ? ('material' as const) : ('uikit' as const),
    tabBarLabelPosition: expanded ? ('beside-icon' as const) : ('below-icon' as const),
    tabBarActiveTintColor: palette.blueAction,
    tabBarInactiveTintColor: palette.muted,
    tabBarHideOnKeyboard: true,
    tabBarItemStyle: expanded
      ? { minHeight: 56, alignItems: 'flex-start' as const, paddingHorizontal: 16 }
      : { minHeight: 56, paddingHorizontal: 4 },
    tabBarLabelStyle: { fontSize: 12, fontWeight: '700' as const },
    tabBarStyle: expanded
      ? {
          width: 232,
          backgroundColor: palette.card,
          borderRightColor: palette.faint,
          borderRightWidth: 1,
          paddingVertical: 12,
        }
      : {
          backgroundColor: palette.card,
          borderTopColor: palette.faint,
          paddingTop: 5,
          paddingBottom: 5,
        },
  };
}

const hiddenScreenOptions = {
  href: null,
  tabBarStyle: { display: 'none' as const },
};

export function StudentTabsLayout() {
  const screenOptions = useAdaptiveTabOptions();

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color, size }) => <ListOrdered color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="explore" options={hiddenScreenOptions} />
      <Tabs.Screen name="appointment-ticket" options={hiddenScreenOptions} />
      <Tabs.Screen name="appointment-status" options={hiddenScreenOptions} />
      <Tabs.Screen name="appointment-request" options={hiddenScreenOptions} />
      <Tabs.Screen name="appointment-confirmation" options={hiddenScreenOptions} />
      <Tabs.Screen name="queue-history" options={hiddenScreenOptions} />
      <Tabs.Screen name="notifications" options={hiddenScreenOptions} />
      <Tabs.Screen name="my-appointments" options={hiddenScreenOptions} />
      <Tabs.Screen name="schedule" options={hiddenScreenOptions} />
      <Tabs.Screen name="service-details" options={hiddenScreenOptions} />
    </Tabs>
  );
}

export function StaffTabsLayout() {
  const screenOptions = useAdaptiveTabOptions();

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="cashier-dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="appointment-requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="active-queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color, size }) => <ListOrdered color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="service-management"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="staff-settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="cashier-scanner" options={hiddenScreenOptions} />
      <Tabs.Screen name="transaction-records" options={hiddenScreenOptions} />
      <Tabs.Screen name="appointment-management" options={hiddenScreenOptions} />
      <Tabs.Screen name="staff-management" options={hiddenScreenOptions} />
      <Tabs.Screen name="appointment-details" options={hiddenScreenOptions} />
      <Tabs.Screen name="schedule-settings" options={hiddenScreenOptions} />
      <Tabs.Screen name="now-serving" options={hiddenScreenOptions} />
      <Tabs.Screen name="queue-capacity" options={hiddenScreenOptions} />
      <Tabs.Screen name="admin" options={hiddenScreenOptions} />
    </Tabs>
  );
}
