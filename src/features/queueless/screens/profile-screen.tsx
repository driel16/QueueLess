import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen } from '../components';
import { styles } from '../styles';

export default function ProfileScreen() {
  return (
    <AppScreen current="profile">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>MS</Text>
          </View>
          <Text style={styles.h1}>Maria Santos</Text>
          <Text style={styles.mutedCenter}>BS Information Systems | 2022-10458</Text>
        </View>
        {([
          ['Student Email', 'maria.santos@student.su.edu'],
          ['Program', 'College of Computing'],
          ['Default Cashier', 'State University Main Cashier'],
        ] as const).map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <Text style={styles.itemSubtle}>{label}</Text>
            <Text style={styles.itemTitle}>{value}</Text>
          </View>
        ))}
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
      </ScrollView>
    </AppScreen>
  );
}
