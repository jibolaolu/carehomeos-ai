import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { startVoiceNote, stopVoiceNote, type RecordingState } from "../../services/audio";
import { enqueueOfflineJob } from "../../services/offline";

export default function RecordNoteScreen() {
  const [state, setState] = useState<RecordingState>("idle");
  const [message, setMessage] = useState("Choose a resident and record up to 60 seconds. Speak naturally in English, Polish, Romanian, French or Spanish.");

  async function toggleRecording() {
    if (state !== "recording") {
      await startVoiceNote();
      setState("recording");
      setMessage("Recording in progress. CareHomeOS will detect the spoken language and translate the note to English for review when DeepL is configured.");
      return;
    }

    const recording = await stopVoiceNote();
    enqueueOfflineJob({ kind: "care-note", payload: recording });
    setState("reviewing");
    setMessage("Voice note queued with multilingual transcript metadata. It will sync when the device is online.");
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Record care note</Text>
        <View style={styles.languageRow}>
          {["EN", "PL", "RO", "FR", "ES"].map((language) => (
            <Text key={language} style={styles.languageChip}>{language}</Text>
          ))}
        </View>
        <Text style={styles.body}>{message}</Text>
        <TouchableOpacity style={[styles.button, state === "recording" && styles.recording]} onPress={toggleRecording}>
          <Text style={styles.buttonText}>{state === "recording" ? "Stop recording" : "Start recording"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 20 },
  title: { color: "#0f172a", fontSize: 30, fontWeight: "800" },
  languageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  languageChip: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe", borderRadius: 8, borderWidth: 1, color: "#3730a3", fontSize: 12, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 6 },
  body: { color: "#64748b", fontSize: 16, lineHeight: 24 },
  button: { alignItems: "center", backgroundColor: "#4f46e5", borderRadius: 14, padding: 18 },
  recording: { backgroundColor: "#dc2626" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
