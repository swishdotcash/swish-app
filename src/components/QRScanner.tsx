import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

interface QRScannerProps {
  visible: boolean;
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ visible, onScan, onClose }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  if (!visible) return null;

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={[styles.text, { marginBottom: 8 }]}>
            Camera access is needed to scan QR codes
          </Text>
          <Pressable onPress={requestPermission} style={styles.grantButton}>
            <Text style={styles.grantButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                // Strip "solana:" prefix if present
                const address = data.replace(/^solana:/, "");
                onScan(address);
              }
        }
      />

      {/* Overlay with cutout effect */}
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        <Text style={styles.hint}>Point at a Solana wallet QR code</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 100,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fafafa",
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  permissionBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  grantButton: {
    backgroundColor: "#fafafa",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 12,
  },
  grantButtonText: {
    color: "#121212",
    fontFamily: "Jost_600SemiBold",
    fontSize: 14,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  cancelText: {
    color: "#fafafa",
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 80,
  },
  closeButton: {
    backgroundColor: "rgba(18, 18, 18, 0.6)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  closeText: {
    color: "#fafafa",
    fontFamily: "Jost_500Medium",
    fontSize: 14,
  },
  hint: {
    color: "#fafafa",
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    backgroundColor: "rgba(18, 18, 18, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
});
