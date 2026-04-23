import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const alerts = [
  ["Safeguarding", "Rough handling disclosure needs immediate review", "#dc2626"],
  ["Deterioration", "Evelyn Morgan has pressure area and reduced intake", "#d97706"],
  ["Falls", "Margaret Ellis post-fall observations due", "#d97706"],
];

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Senior alerts</Text>
        {alerts.map(([type, body, color]) => (
          <View style={styles.card} key={body}>
            <Text style={[styles.type, { color }]}>{type}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, gap: 14 },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "800" },
  card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, padding: 16 },
  type: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  body: { color: "#475569", fontSize: 16, lineHeight: 22, marginTop: 6 },
});
