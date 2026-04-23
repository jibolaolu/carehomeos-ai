import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const metrics = [
  ["CQC readiness", "87%"],
  ["Residents in focus", "3"],
  ["Open incidents", "2"],
  ["Training compliance", "91%"],
];

export default function ManagerDashboardScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Manager overview</Text>
        {metrics.map(([label, value]) => (
          <View style={styles.card} key={label}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
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
  value: { color: "#0f172a", fontSize: 30, fontWeight: "900" },
  label: { color: "#64748b", marginTop: 4 },
});
