import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const updates = [
  "Enjoyed music group with two other residents.",
  "Accepted a fortified drink after breakfast.",
  "Care team reviewed hydration prompts for the afternoon.",
];

export default function UpdatesScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Daily updates</Text>
        {updates.map((update) => (
          <View style={styles.card} key={update}><Text style={styles.body}>{update}</Text></View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, gap: 12 },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "900" },
  card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, padding: 16 },
  body: { color: "#475569", fontSize: 16, lineHeight: 23 },
});
