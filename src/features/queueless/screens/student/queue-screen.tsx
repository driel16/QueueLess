import { ScrollView } from 'react-native';

import { AppScreen, EmptyState, Header } from '../../components';
import { styles } from '../../styles';

export default function QueueScreen() {
  return (
    <AppScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="My Queue" subtitle="Live ticket status" backTo="/home" />
        <EmptyState
          title="You’re not in a queue"
          message="Book an appointment to get a queue ticket and track your place here."
        />
      </ScrollView>
    </AppScreen>
  );
}
