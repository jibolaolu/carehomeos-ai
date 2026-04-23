import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.body}>Send a non-urgent message to the care team. Urgent clinical concerns should be phoned through to the home.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc", padding: 20, justifyContent: "center" },
  card: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, padding: 20 },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "900" },
  body: { color: "#475569", fontSize: 16, lineHeight: 24, marginTop: 12 },
});
