import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ErrorBanner, StaffHeader, StaffScreen } from '../../components';
import { parseAppointmentQrPayload } from '../../appointment-qr';
import { styles } from '../../styles';
import { palette } from '../../palette';

export default function CashierScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string>();
  const [hasScanned, setHasScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  const enableCamera = async () => {
    setScanError(undefined);
    try {
      const result = permission?.granted ? permission : await requestPermission();
      if (result.granted) {
        setCameraEnabled(true);
      } else if (!result.canAskAgain) {
        setScanError('Camera access is blocked. Enable it in your device settings to scan QR codes.');
      }
    } catch (error) {
      setScanError(
        error instanceof Error ? error.message : 'Could not request camera access. Try again.',
      );
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScanned) return;
    const appointmentId = parseAppointmentQrPayload(data);
    if (!appointmentId) {
      setScanError('This QR code is not a QueueLess appointment ticket. Try scanning again.');
      return;
    }
    setHasScanned(true);
    router.replace({
      pathname: '/appointment-details',
      params: { ticket: appointmentId, source: 'scan' },
    });
  };

  return (
    <StaffScreen current="queue">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaffHeader
          title="Scan Student QR"
          subtitle="Verify an appointment and check the student in"
          backTo="/active-queue"
        />
        {scanError ? <ErrorBanner message={scanError} /> : null}
        {!permission ? (
          <ActivityIndicator color={palette.greenDark} />
        ) : !cameraEnabled ? (
          <View style={styles.scannerPermissionCard}>
            <Text style={styles.itemTitle}>
              {permission.granted ? 'Ready to scan?' : 'Camera access required'}
            </Text>
            <Text style={styles.itemSubtle}>
              Camera access is used to scan a student’s appointment ticket. The camera will only
              open after you continue.
            </Text>
            <Pressable
              style={styles.primaryButton}
              accessibilityRole="button"
              onPress={() => void enableCamera()}>
              <Text style={styles.primaryButtonText}>
                {permission.granted ? 'Continue to Camera' : 'Allow Camera'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.scannerFrame}>
              <CameraView
                style={styles.scannerCamera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
              />
            </View>
            <Text style={styles.scannerHint}>
              Center the student’s QueueLess QR code in the camera frame.
            </Text>
            <Pressable
              style={styles.secondaryButton}
              accessibilityRole="button"
              onPress={() => router.replace('/active-queue')}>
              <Text style={styles.secondaryButtonText}>Cancel Scan</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </StaffScreen>
  );
}
