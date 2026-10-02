import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '../../components';
import { TERMS_VERSION, termsSections } from '../../terms';
import { styles } from '../../styles';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title="Terms & Conditions"
          subtitle="Please review these terms before creating your student account."
          backTo="/register"
        />
        <View style={styles.appointmentStatusCard}>
          <Text style={styles.itemSubtle}>Draft for school review · Version {TERMS_VERSION}</Text>
          <Text style={styles.itemSubtle}>
            This draft describes QueueLess app use. Ask the school to review and approve it, along
            with its privacy notice, before using it as a production legal agreement.
          </Text>
        </View>
        {termsSections.map((section) => (
          <View key={section.title} style={styles.appointmentStatusCard}>
            <Text style={styles.itemTitle}>{section.title}</Text>
            <Text style={[styles.itemSubtle, { fontSize: 14, lineHeight: 21 }]}>
              {section.body}
            </Text>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Back to registration</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
