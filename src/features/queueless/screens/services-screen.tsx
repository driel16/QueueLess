import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen, Header } from '../components';
import { services } from '../data';
import { styles } from '../styles';

export default function ServicesScreen() {
  return (
    <AppScreen current="services">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Cashier Services" subtitle="Choose a service to book your spot" backTo="/home" />
        <View style={styles.serviceList}>
          {services.map((service) => (
            <Pressable key={service.title} style={styles.serviceCard} onPress={() => router.push('/service-details')}>
              <View style={styles.serviceIcon}>
                <Text style={styles.serviceIconText}>{service.icon}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.itemTitle}>{service.title}</Text>
                <Text style={styles.itemSubtle}>{service.body}</Text>
              </View>
              <Text style={styles.chevron}>{'>'}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}
