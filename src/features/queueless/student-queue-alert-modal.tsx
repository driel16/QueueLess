import { Modal, Pressable, Text, View } from 'react-native';

import { palette } from './palette';
import type { StudentQueueAlert } from './use-student-queue-alerts';

type StudentQueueAlertModalProps = {
  notifications: StudentQueueAlert[];
  onDismiss: () => void;
};

export function StudentQueueAlertModal({
  notifications,
  onDismiss,
}: StudentQueueAlertModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={notifications.length > 0}
      onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 24,
          backgroundColor: 'rgba(18, 33, 59, 0.48)',
        }}>
        <View
          accessibilityRole="alert"
          style={{
            gap: 12,
            borderRadius: 22,
            padding: 24,
            backgroundColor: palette.card,
          }}>
          <Text style={{ color: palette.ink, fontSize: 20, fontWeight: '900' }}>
            {notifications[0]?.title}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            {notifications[0]?.message}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={{
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              backgroundColor: palette.greenDark,
            }}
            onPress={onDismiss}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>
              {notifications.length > 1 ? 'Next alert' : 'Got it'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
