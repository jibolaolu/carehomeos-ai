import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Divider, FAB, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

type UpdateCategory = 'all' | 'nutrition' | 'wellbeing' | 'medical' | 'social';

type CareUpdate = {
  id: string;
  date: string;
  time: string;
  category: 'nutrition' | 'wellbeing' | 'medical' | 'social';
  title: string;
  note: string;
  author: string;
  authorRole: string;
  hasMedia: boolean;
};

const UPDATES: CareUpdate[] = [
  {
    id: 'u1', date: 'Today', time: '11:45',
    category: 'social', title: 'Music group session',
    note: 'Margaret joined the morning music group and engaged really positively with staff and other residents. She sang along to several familiar songs and was smiling throughout. A lovely session for her.',
    author: 'Amara O.', authorRole: 'Care assistant', hasMedia: false,
  },
  {
    id: 'u2', date: 'Today', time: '09:30',
    category: 'nutrition', title: 'Breakfast — partial intake',
    note: 'Margaret ate approximately half of her breakfast: some toast but declined the porridge. She accepted a fortified nutritional supplement drink (partial). Oral intake being monitored closely. Target fluids: 1,500ml today.',
    author: 'Amara O.', authorRole: 'Care assistant', hasMedia: false,
  },
  {
    id: 'u3', date: 'Today', time: '08:05',
    category: 'wellbeing', title: 'Morning care — settled and comfortable',
    note: 'Margaret was awake when staff arrived and appeared rested. She was cooperative during personal care and requested Radio 2 to be played. No pain reported. Skin check completed — no new concerns.',
    author: 'Lee F.', authorRole: 'Care assistant', hasMedia: false,
  },
  {
    id: 'u4', date: 'Yesterday', time: '15:30',
    category: 'medical', title: 'District nurse visit',
    note: 'District nurse Priya visited to reassess the pressure area on Margaret\'s left heel. Graded 1 (non-blanching redness). Repositioning plan updated to 2-hourly turns. Next review scheduled in 3 days.',
    author: 'District Nurse', authorRole: 'NHS Community', hasMedia: false,
  },
  {
    id: 'u5', date: 'Yesterday', time: '12:00',
    category: 'nutrition', title: 'Good lunch intake',
    note: 'Margaret had an excellent lunch today — ate all of the shepherd\'s pie and had a full glass of apple juice. The kitchen team prepared her a favourite pudding (rice pudding) which she thoroughly enjoyed.',
    author: 'Esther K.', authorRole: 'Senior carer', hasMedia: false,
  },
  {
    id: 'u6', date: '26 Jun', time: '14:00',
    category: 'social', title: 'Family video call',
    note: 'Margaret had a 20-minute video call with her daughter this afternoon. She was animated and cheerful during the call. She asked when the next visit would be. Staff set a reminder for Tuesday.',
    author: 'Amara O.', authorRole: 'Care assistant', hasMedia: false,
  },
];

const CATEGORY_CONFIG: Record<Exclude<UpdateCategory, 'all'>, { label: string; color: string; bg: string }> = {
  nutrition: { label: 'Nutrition',  color: '#d97706', bg: '#fffbeb' },
  wellbeing: { label: 'Wellbeing', color: '#059669', bg: '#f0fdf4' },
  medical:   { label: 'Medical',   color: '#1d4ed8', bg: '#eff6ff' },
  social:    { label: 'Social',    color: '#7c3aed', bg: '#f5f3ff' },
};

export function UpdatesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<UpdateCategory>('all');

  const filtered = filter === 'all' ? UPDATES : UPDATES.filter((u) => u.category === filter);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>CareHomeOS Family</Text>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Care updates</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Margaret Ellis · Oakfield House
            </Text>
          </View>
          <Button mode="text" compact onPress={() => navigation.goBack()} textColor={theme.colors.onSurfaceVariant} accessibilityLabel="Go back">
            Back
          </Button>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          {(['all', 'nutrition', 'wellbeing', 'medical', 'social'] as UpdateCategory[]).map((cat) => (
            <Chip
              key={cat}
              selected={filter === cat}
              onPress={() => setFilter(cat)}
              compact
              style={[styles.filterChip, filter === cat && { backgroundColor: theme.colors.primaryContainer }]}
              accessibilityLabel={`Filter by ${cat}`}
            >
              {cat === 'all' ? 'All' : CATEGORY_CONFIG[cat].label}
            </Chip>
          ))}
        </ScrollView>

        {filtered.map((update, idx) => {
          const cfg = CATEGORY_CONFIG[update.category];
          const showDateLabel = idx === 0 || filtered[idx - 1].date !== update.date;
          return (
            <View key={update.id}>
              {showDateLabel && (
                <Text style={[styles.dateLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {update.date}
                </Text>
              )}
              <Card style={styles.updateCard}>
                <Card.Content style={styles.updateContent}>
                  <View style={styles.updateTop}>
                    <View style={[styles.categoryPill, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.categoryLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={[styles.updateTime, { color: theme.colors.onSurfaceVariant }]}>
                      {update.time}
                    </Text>
                  </View>
                  <Text style={[styles.updateTitle, { color: theme.colors.onSurface }]}>
                    {update.title}
                  </Text>
                  <Text style={[styles.updateNote, { color: theme.colors.onSurfaceVariant }]}>
                    {update.note}
                  </Text>
                  <Divider style={styles.updateDivider} />
                  <Text style={[styles.updateAuthor, { color: theme.colors.onSurfaceVariant }]}>
                    {update.author} · {update.authorRole}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                No updates in this category yet.
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="message"
        label="Message team"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={() => navigation.navigate('FamilyMessages')}
        accessibilityLabel="Send message to care team"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { fontSize: 13, marginTop: 2 },
  filterBar: { marginHorizontal: -16, marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: { height: 30 },
  dateLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6, marginBottom: 2 },
  updateCard: { borderRadius: 12 },
  updateContent: { gap: 8, paddingTop: 12 },
  updateTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  categoryLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  updateTime: { fontSize: 11, fontWeight: '700' },
  updateTitle: { fontSize: 14, fontWeight: '800', lineHeight: 20 },
  updateNote: { fontSize: 13, lineHeight: 21 },
  updateDivider: { marginVertical: 2 },
  updateAuthor: { fontSize: 11 },
  emptyCard: { borderRadius: 12 },
  fab: { position: 'absolute', bottom: 24, right: 16 },
});
