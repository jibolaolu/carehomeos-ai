import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function AlertScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.badge}>No urgent alerts</Text>
        <Text style={styles.title}>Emergency notifications</Text>
        <Text style={styles.body}>When the home needs to contact family urgently, the alert and follow-up status will appear here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc", padding: 20, justifyContent: "center" },
  card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, padding: 20 },
  badge: { alignSelf: "flex-start", color: "#059669", backgroundColor: "#ecfdf5", padding: 8, borderRadius: 999, overflow: "hidden", fontWeight: "800" },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "900", marginTop: 16 },
  body: { color: "#475569", fontSize: 16, lineHeight: 24, marginTop: 12 },
});
