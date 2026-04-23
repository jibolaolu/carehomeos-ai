import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function NoteReviewScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.badge}>SOFT_FLAG 82%</Text>
        <Text style={styles.title}>Nutrition note review</Text>
        <Text style={styles.body}>Margaret ate half of breakfast, accepted a fortified drink, and needed prompting with fluids. Approve filing or request clarification from the carer.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc", padding: 20, justifyContent: "center" },
  card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, padding: 20 },
  badge: { alignSelf: "flex-start", color: "#d97706", backgroundColor: "#fffbeb", padding: 8, borderRadius: 999, overflow: "hidden", fontWeight: "800" },
  title: { color: "#0f172a", fontSize: 26, fontWeight: "800", marginTop: 16 },
  body: { color: "#475569", fontSize: 16, lineHeight: 24, marginTop: 10 },
});
