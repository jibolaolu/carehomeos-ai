import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const meds = [
  ["Margaret Ellis", "Memantine 10mg", "Administered"],
  ["George Patel", "Amlodipine 5mg", "Administered"],
  ["Evelyn Morgan", "Paracetamol 1g PRN", "Due"],
];

export default function MARScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Medication round</Text>
        {meds.map(([resident, medication, status]) => (
          <View style={styles.card} key={`${resident}-${medication}`}>
            <Text style={styles.cardTitle}>{resident}</Text>
            <Text style={styles.muted}>{medication}</Text>
            <Text style={[styles.badge, status === "Due" && styles.due]}>{status}</Text>
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
  cardTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  muted: { color: "#64748b", marginTop: 6 },
  badge: { alignSelf: "flex-start", color: "#059669", backgroundColor: "#ecfdf5", marginTop: 12, padding: 8, borderRadius: 999, overflow: "hidden", fontWeight: "800" },
  due: { color: "#d97706", backgroundColor: "#fffbeb" },
});
