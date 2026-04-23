import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.kicker}>CareHomeOS Family</Text>
        <Text style={styles.title}>Good afternoon</Text>
        <Text style={styles.body}>Margaret had a calm morning and enjoyed music group. The team supported her with drinks and will keep you updated.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc", padding: 20, justifyContent: "center" },
  card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, padding: 20 },
  kicker: { color: "#4f46e5", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  title: { color: "#0f172a", fontSize: 30, fontWeight: "900", marginTop: 8 },
  body: { color: "#475569", fontSize: 16, lineHeight: 24, marginTop: 12 },
});
