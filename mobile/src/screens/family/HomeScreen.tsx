import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function FamilyHomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Family update</Text>
        <Text style={styles.body}>Margaret had a settled morning and enjoyed music group. The team supported her with drinks and will keep encouraging fluids today.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc", padding: 20, justifyContent: "center" },
  card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, padding: 20 },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "800" },
  body: { color: "#475569", fontSize: 16, lineHeight: 24, marginTop: 12 },
});
