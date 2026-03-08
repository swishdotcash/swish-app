import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { CameraView, useCameraPermissions } from "expo-camera";
import { hapticLight } from "@/utils/haptics";

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
          <Pressable onPress={() => { hapticLight(); requestPermission(); }} style={styles.grantButton}>
            <Text style={styles.grantButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable onPress={() => { hapticLight(); onClose(); }} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
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
      {/* Scan frame — corner brackets animate in */}
      <Animated.View
        entering={FadeIn.delay(120).duration(300)}
        style={styles.scanFrame}
        pointerEvents="none"
      >
        {/* Corner brackets */}
        {["tl", "tr", "bl", "br"].map((corner) => (
          <View key={corner} style={[styles.corner, styles[corner as keyof typeof styles] as object]} />
        ))}
      </Animated.View>

      {/* Overlay controls */}
      <View style={styles.overlay}>
        <Pressable onPress={() => { hapticLight(); onClose(); }} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        <Text style={styles.hint}>Point at a Solana wallet QR code</Text>
      </View>
    </Animated.View>
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
  scanFrame: {
    position: "absolute",
    width: 220,
    height: 220,
    top: "50%",
    left: "50%",
    marginTop: -110,
    marginLeft: -110,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#fafafa",
    borderWidth: 2.5,
  },
  tl: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  tr: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  br: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
});
