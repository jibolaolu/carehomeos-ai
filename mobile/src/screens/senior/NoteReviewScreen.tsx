import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  TextInput,
  Text,
  useTheme,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import OfflineIndicator from '../../components/OfflineIndicator';

const PENDING_NOTES = [
  {
    id: 'n1',
    resident: 'Margaret Ellis',
    room: '101',
    noteType: 'Nutrition',
    carer: 'Amara O.',
    recordedAt: 'Today 09:47',
    confidence: 0.82,
    flags: ['low_intake', 'fluid_concern'],
    transcript: 'Margaret ate about half of her breakfast this morning. She had some toast but left the porridge. I offered her a fortified drink and she took a few sips. She was a bit sleepy during the meal. I made sure she was upright and comfortable before starting.',
    generatedNote: 'Resident consumed approximately 50% of breakfast. Offered fortified nutritional supplement — partial intake only. Resident appeared drowsy during mealtime; appropriate positioning ensured prior to eating. Fluid intake remained below daily target. Oral intake and hydration to be monitored closely throughout shift. Care plan fluid target: 1,500ml.',
  },
  {
    id: 'n2',
    resident: 'George Patel',
    room: '102',
    noteType: 'General',
    carer: 'Lee F.',
    recordedAt: 'Today 10:15',
    confidence: 0.94,
    flags: [],
    transcript: 'George had a good morning. He joined the armchair exercises and seemed to enjoy it. He asked about his daughter visiting this weekend.',
    generatedNote: 'Resident engaged positively with the morning armchair exercise session. Good mood and sociability noted. Resident expressed interest in upcoming family visit. No concerns observed during the morning shift.',
  },
];

export default function NoteReviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const noteId = route.params?.noteId ?? 'n1';

  const note = PENDING_NOTES.find((n) => n.id === noteId) ?? PENDING_NOTES[0];
  const [editedNote, setEditedNote] = useState(note.generatedNote);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    Alert.alert('Note approved', 'The care note has been filed to the resident record.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  function handleRequestClarification() {
    Alert.alert(
      'Request clarification',
      `Send a notification to ${note.carer} asking them to review this note?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => navigation.goBack() },
      ],
    );
  }

  const confidenceColor = note.confidence >= 0.9 ? '#059669' : note.confidence >= 0.75 ? '#d97706' : '#dc2626';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Note review</Text>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>{note.resident}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Room {note.room} · {note.noteType} · {note.recordedAt}
            </Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.confidenceRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>AI confidence</Text>
              <Text style={[styles.confidenceValue, { color: confidenceColor }]}>
                {Math.round(note.confidence * 100)}%
              </Text>
            </View>
            <ProgressBar
              progress={note.confidence}
              color={confidenceColor}
              style={styles.progressBar}
            />
            {note.flags.length > 0 && (
              <View style={styles.flagRow}>
                {note.flags.map((f) => (
                  <Chip key={f} compact icon="alert" style={styles.flagChip} textStyle={styles.flagChipText}>
                    {f.replace(/_/g, ' ')}
                  </Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Voice transcript" subtitle={`Recorded by ${note.carer}`} titleStyle={{ fontSize: 14, fontWeight: '700' }} subtitleStyle={{ fontSize: 12 }} />
          <Divider />
          <Card.Content style={styles.cardContent}>
            <Text style={[styles.transcriptText, { color: theme.colors.onSurfaceVariant }]}>
              "{note.transcript}"
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title="AI-generated note"
            titleStyle={{ fontSize: 14, fontWeight: '700' }}
            right={() => (
              <Button
                mode="text"
                compact
                onPress={() => setEditing((v) => !v)}
                accessibilityLabel={editing ? 'Stop editing' : 'Edit note'}
              >
                {editing ? 'Done' : 'Edit'}
              </Button>
            )}
          />
          <Divider />
          <Card.Content style={styles.cardContent}>
            {editing ? (
              <TextInput
                mode="outlined"
                multiline
                numberOfLines={6}
                value={editedNote}
                onChangeText={setEditedNote}
                style={styles.editInput}
                accessibilityLabel="Edit generated care note"
              />
            ) : (
              <Text style={[styles.noteText, { color: theme.colors.onSurface }]}>{editedNote}</Text>
            )}
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="check"
            onPress={handleApprove}
            loading={submitting}
            disabled={submitting}
            style={styles.approveBtn}
            accessibilityLabel="Approve and file this care note"
          >
            Approve &amp; file
          </Button>
          <Button
            mode="outlined"
            icon="message-question"
            onPress={handleRequestClarification}
            disabled={submitting}
            style={styles.clarifyBtn}
            accessibilityLabel="Request clarification from carer"
          >
            Request clarification
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            textColor={theme.colors.onSurfaceVariant}
            accessibilityLabel="Go back"
          >
            Back
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { marginTop: 8 },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  subtitle: { fontSize: 13, marginTop: 3 },
  card: { borderRadius: 12 },
  cardContent: { gap: 8, paddingTop: 12 },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  confidenceValue: { fontSize: 16, fontWeight: '800' },
  progressBar: { height: 6, borderRadius: 3 },
  flagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  flagChip: { backgroundColor: '#fffbeb' },
  flagChipText: { color: '#92400e', fontSize: 11 },
  transcriptText: { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  noteText: { fontSize: 14, lineHeight: 22 },
  editInput: { fontSize: 13, minHeight: 130 },
  actions: { gap: 10 },
  approveBtn: { paddingVertical: 4 },
  clarifyBtn: { paddingVertical: 4 },
});
