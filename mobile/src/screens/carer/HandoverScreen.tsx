import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function HandoverScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Shift handover</Text>
        <Text style={styles.body}>AI summary: Margaret needs fluids prompting, Evelyn has heel redness review, and the 10:00 PRN check remains due.</Text>
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
