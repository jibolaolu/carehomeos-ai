import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';

type MessageAuthor = 'family' | 'care_team';

type Message = {
  id: string;
  author: MessageAuthor;
  authorName: string;
  body: string;
  timestamp: string;
  read: boolean;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1', author: 'care_team', authorName: 'Amara O. (Oakfield House)',
    body: 'Good afternoon! Just wanted to let you know Margaret had a lovely morning at the music group — she was singing along and in great spirits. We will keep you posted on how her afternoon goes.',
    timestamp: 'Today, 12:10', read: true,
  },
  {
    id: 'm2', author: 'family', authorName: 'You',
    body: 'Thank you so much — that is really wonderful to hear! We were a bit worried after her GP appointment last week. Has her heel improved at all?',
    timestamp: 'Today, 12:22', read: true,
  },
  {
    id: 'm3', author: 'care_team', authorName: 'Esther K. (Senior carer)',
    body: 'Hi, Esther here. The district nurse visited yesterday and graded the pressure area as a Grade 1 — that is the very earliest stage. We have updated her repositioning plan to 2-hourly turns and it is already looking a bit better. We are monitoring it very carefully.',
    timestamp: 'Today, 13:05', read: true,
  },
  {
    id: 'm4', author: 'care_team', authorName: 'Oakfield House',
    body: 'Reminder: Margaret\'s GP is visiting on Thursday at 10:00. You are welcome to join the appointment by video call if you would like. Just let us know and we will set it up.',
    timestamp: 'Yesterday, 16:30', read: false,
  },
];

const DISCLAIMER = 'Messages are reviewed by care staff during working hours (8am–8pm). For urgent clinical concerns, please call the home directly.';

export function MessagesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));
    const newMsg: Message = {
      id: `m${Date.now()}`,
      author: 'family',
      authorName: 'You',
      body: text,
      timestamp: 'Just now',
      read: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setDraft('');
    setSending(false);
  }

  function handleCall() {
    Alert.alert(
      'Call Oakfield House',
      'This will open your phone dialler to call the home directly.\n\n01234 567 890',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call now', onPress: () => {} },
      ],
    );
  }

  const unread = messages.filter((m) => !m.read && m.author === 'care_team').length;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.appBar}>
          <Button mode="text" compact onPress={() => navigation.goBack()} textColor={theme.colors.onSurfaceVariant} accessibilityLabel="Go back">
            Back
          </Button>
          <View style={styles.appBarTitle}>
            <Text style={[styles.appBarName, { color: theme.colors.onSurface }]}>Oakfield House</Text>
            <Text style={[styles.appBarSub, { color: theme.colors.onSurfaceVariant }]}>Margaret Ellis · Care team</Text>
          </View>
          <Button mode="outlined" compact icon="phone" onPress={handleCall} accessibilityLabel="Call care home">
            Call
          </Button>
        </View>

        {unread > 0 && (
          <Chip icon="bell" compact style={styles.unreadChip} textStyle={{ color: '#1d4ed8' }}>
            {unread} new message{unread !== 1 ? 's' : ''} from the care team
          </Chip>
        )}

        <ScrollView contentContainerStyle={styles.messages}>
          <Card style={[styles.disclaimerCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text style={[styles.disclaimerText, { color: theme.colors.onSurfaceVariant }]}>{DISCLAIMER}</Text>
            </Card.Content>
          </Card>

          {messages.map((msg) => {
            const isFamily = msg.author === 'family';
            return (
              <View
                key={msg.id}
                style={[styles.msgRow, isFamily ? styles.msgRowRight : styles.msgRowLeft]}
                accessibilityLabel={`${msg.authorName}: ${msg.body}`}
              >
                <View
                  style={[
                    styles.bubble,
                    isFamily
                      ? [styles.bubbleFamily, { backgroundColor: theme.colors.primary }]
                      : [styles.bubbleCare, { backgroundColor: theme.colors.surfaceVariant }],
                  ]}
                >
                  {!isFamily && (
                    <Text style={[styles.bubbleSender, { color: theme.colors.primary }]}>
                      {msg.authorName}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: isFamily ? '#fff' : theme.colors.onSurface },
                    ]}
                  >
                    {msg.body}
                  </Text>
                  <Text
                    style={[
                      styles.bubbleTime,
                      { color: isFamily ? 'rgba(255,255,255,0.7)' : theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
          <TextInput
            mode="outlined"
            placeholder="Write a message to the care team…"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={500}
            style={styles.composerInput}
            dense
            accessibilityLabel="Message text input"
          />
          <Button
            mode="contained"
            onPress={handleSend}
            loading={sending}
            disabled={sending || !draft.trim()}
            accessibilityLabel="Send message"
            style={styles.sendBtn}
          >
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  appBarTitle: { flex: 1, alignItems: 'center', gap: 2 },
  appBarName: { fontSize: 14, fontWeight: '800' },
  appBarSub: { fontSize: 11 },
  unreadChip: { margin: 8, alignSelf: 'center', backgroundColor: '#eff6ff' },
  messages: { padding: 14, gap: 10, paddingBottom: 20 },
  disclaimerCard: { borderRadius: 10, marginBottom: 6 },
  disclaimerText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  msgRow: { maxWidth: '80%' },
  msgRowLeft: { alignSelf: 'flex-start' },
  msgRowRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 14, padding: 12, gap: 4 },
  bubbleFamily: { borderBottomRightRadius: 4 },
  bubbleCare: { borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 11, fontWeight: '800' },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  composer: {
    flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  composerInput: { flex: 1, maxHeight: 120, fontSize: 14 },
  sendBtn: { alignSelf: 'flex-end', minWidth: 64 },
});
