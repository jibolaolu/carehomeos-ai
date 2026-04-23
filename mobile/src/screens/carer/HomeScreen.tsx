import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const residents = ["Margaret Ellis - nutrition watch", "George Patel - rehab walk", "Evelyn Morgan - pressure care"];

export default function CarerHomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Today</Text>
        <Text style={styles.title}>Carer workspace</Text>
        {residents.map((resident) => (
          <View style={styles.card} key={resident}>
            <Text style={styles.cardTitle}>{resident}</Text>
            <Text style={styles.muted}>Record care note, MAR, hydration, and handover from this resident card.</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, gap: 14 },
  eyebrow: { color: "#4f46e5", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "800" },
  card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, padding: 16 },
  cardTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  muted: { color: "#64748b", marginTop: 6, lineHeight: 20 },
});
