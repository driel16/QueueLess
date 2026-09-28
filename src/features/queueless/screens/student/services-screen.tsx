import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AppScreen, EmptyState, ErrorBanner, Header } from '../../components';
import { services } from '../../data';
import { getServiceAvailability } from '../../settings';
import { styles } from '../../styles';
import { palette } from '../../palette';

export default function ServicesScreen() {
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    getServiceAvailability(services.map((service) => service.id))
      .then((result) => {
        if (isMounted) setAvailability(result);
      })
      .catch(() => {
        if (isMounted) setError('Could not load available services. Please check your connection and try again.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const availableServices = services.filter((service) => availability[service.id] !== false);

  return (
    <AppScreen current="services">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Cashier Services" subtitle="Choose a service to book your spot" backTo="/home" />
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <ActivityIndicator color={palette.greenDark} /> : null}
        {!isLoading && !error && !availableServices.length ? (
          <EmptyState title="No services available" message="The cashier has temporarily turned off all bookable services." />
        ) : null}
        <View style={styles.serviceList}>
          {!isLoading && !error ? availableServices.map((service) => (
              <Pressable
                key={service.id}
                style={styles.serviceCard}
                onPress={() =>
                  router.push({ pathname: '/service-details', params: { serviceTitle: service.title } })
                }>
                <View style={styles.serviceIcon}>
                  <Text style={styles.serviceIconText}>{service.icon}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.itemTitle}>{service.title}</Text>
                  <Text style={styles.itemSubtle}>{service.body}</Text>
                </View>
                <Text style={styles.chevron}>{'>'}</Text>
              </Pressable>
            )) : null}
        </View>
      </ScrollView>
    </AppScreen>
  );
}
