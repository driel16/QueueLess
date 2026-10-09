import { BellRing } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';

import { useQueuelessPalette } from '../palette';

type StudentNotificationConsentModalProps = {
  visible: boolean;
  canAskAgain: boolean;
  isWorking: boolean;
  error?: string;
  onEnable: () => void;
  onOpenSettings: () => void;
  onDismiss: () => void;
};

export function StudentNotificationConsentModal({
  visible,
  canAskAgain,
  isWorking,
  error,
  onEnable,
  onOpenSettings,
  onDismiss,
}: StudentNotificationConsentModalProps) {
  const palette = useQueuelessPalette();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 24,
          backgroundColor: palette.modalBackdrop,
        }}>
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 420,
            alignSelf: 'center',
            alignItems: 'center',
            gap: 14,
            borderRadius: 24,
            padding: 24,
            backgroundColor: palette.card,
          }}>
          <View
            style={{
              width: 58,
              height: 58,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: palette.mint,
            }}>
            <BellRing size={27} color={palette.greenDark} strokeWidth={2} />
          </View>
          <Text
            accessibilityRole="header"
            style={{
              color: palette.ink,
              fontSize: 21,
              fontWeight: '900',
              textAlign: 'center',
            }}>
            Stay in the queue loop
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: 15,
              lineHeight: 22,
              textAlign: 'center',
            }}>
            {canAskAgain
              ? 'Get an alert when your appointment is approved or the cashier is ready for you.'
              : 'Notifications are turned off for QueueLess. Allow them in your device settings to receive queue updates.'}
          </Text>
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{
                alignSelf: 'stretch',
                color: palette.dangerAction,
                fontSize: 13,
                fontWeight: '700',
                lineHeight: 19,
                textAlign: 'center',
              }}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isWorking }}
            disabled={isWorking}
            style={{
              minHeight: 50,
              alignSelf: 'stretch',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 15,
              backgroundColor: palette.greenDark,
              opacity: isWorking ? 0.72 : 1,
            }}
            onPress={canAskAgain ? onEnable : onOpenSettings}>
            <Text style={{ color: palette.white, fontSize: 15, fontWeight: '900' }}>
              {isWorking
                ? 'Please wait...'
                : canAskAgain
                  ? 'Enable notifications'
                  : 'Open device settings'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isWorking}
            onPress={onDismiss}
            style={{
              minHeight: 44,
              alignSelf: 'stretch',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: palette.muted, fontSize: 14, fontWeight: '800' }}>
              Not now
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
