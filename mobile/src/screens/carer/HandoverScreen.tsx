import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  List,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import OfflineIndicator from '../../components/OfflineIndicator';

type HandoverItem = {
  id: string;
  category: 'clinical' | 'medication' | 'safeguarding' | 'wellbeing' | 'task';
  resident: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
};

const HANDOVER_ITEMS: HandoverItem[] = [
  { id: 'h1', category: 'clinical',     resident: 'Evelyn Morgan',  detail: 'Heel redness noted on left foot — monitor every 2 hours and document.', priority: 'high',   completed: false },
  { id: 'h2', category: 'medication',   resident: 'Evelyn Morgan',  detail: '10:00 PRN Paracetamol 1g not yet administered — review pain level.',  priority: 'high',   completed: false },
  { id: 'h3', category: 'wellbeing',    resident: 'Margaret Ellis', detail: 'Needs fluid prompting — offered only 200ml by 10:00. Target 1.5L daily.', priority: 'medium', completed: false },
  { id: 'h4', category: 'medication',   resident: 'George Patel',   detail: 'Refused Metformin at breakfast — document and inform nurse.', priority: 'medium', completed: true },
  { id: 'h5', category: 'task',         resident: 'All residents',  detail: 'GP visiting at 14:00 — ensure all care plan documents are accessible.', priority: 'medium', completed: false },
  { id: 'h6', category: 'wellbeing',    resident: 'Margaret Ellis', detail: 'Enjoyed music group this morning — positive engagement noted.', priority: 'low',    completed: true },
];

const CATEGORY_ICONS: Record<HandoverItem['category'], string> = {
  clinical:     'alert-circle',
  medication:   'pill',
  safeguarding: 'shield-alert',
  wellbeing:    'heart',
  task:         'clipboard-check',
};

const PRIORITY_COLOR: Record<HandoverItem['priority'], string> = {
  high:   '#dc2626',
  medium: '#d97706',
  low:    '#059669',
};

export default function HandoverScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const [items, setItems] = useState<HandoverItem[]>(HANDOVER_ITEMS);

  const pendingCount = items.filter((i) => !i.completed).length;

  const toggleItem = (id: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, completed: !i.completed } : i));

  const pending  = items.filter((i) => !i.completed);
  const complete = items.filter((i) =>  i.completed);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>End of shift</Text>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Handover</Text>
          </View>
          {pendingCount > 0 && (
            <Chip icon="clock-alert" textStyle={{ color: '#d97706' }} style={styles.pendingChip}>
              {pendingCount} outstanding
            </Chip>
          )}
        </View>

        <Card style={styles.aiSummaryCard}>
          <Card.Content style={styles.aiSummaryContent}>
            <View style={styles.aiSummaryHeader}>
              <Text style={styles.aiSummaryIcon}>✦</Text>
              <Text style={[styles.aiSummaryLabel, { color: theme.colors.primary }]}>AI handover summary</Text>
            </View>
            <Text style={[styles.aiSummaryText, { color: theme.colors.onSurfaceVariant }]}>
              Overall a calm morning shift. Evelyn Morgan requires clinical monitoring (heel redness, PRN due).
              Margaret Ellis needs fluid prompting — target met only 13%. George Patel refused morning medication.
              GP visiting at 14:00 — documentation ready required.
            </Text>
          </Card.Content>
        </Card>

        {pending.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              Outstanding items
            </Text>
            <Card style={styles.listCard}>
              {pending.map((item, idx) => (
                <View key={item.id}>
                  <List.Item
                    title={item.resident}
                    description={item.detail}
                    descriptionNumberOfLines={3}
                    left={() => (
                      <List.Icon
                        icon={CATEGORY_ICONS[item.category]}
                        color={PRIORITY_COLOR[item.priority]}
                      />
                    )}
                    right={() => (
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => toggleItem(item.id)}
                        accessibilityLabel="Mark as done"
                        style={styles.doneBtn}
                      >
                        Done
                      </Button>
                    )}
                    titleStyle={{ fontWeight: '700', fontSize: 13 }}
                    descriptionStyle={{ fontSize: 12, lineHeight: 17 }}
                    style={styles.listItem}
                  />
                  {idx < pending.length - 1 && <Divider />}
                </View>
              ))}
            </Card>
          </>
        )}

        {complete.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              Completed
            </Text>
            <Card style={styles.listCard}>
              {complete.map((item, idx) => (
                <View key={item.id}>
                  <List.Item
                    title={item.resident}
                    description={item.detail}
                    descriptionNumberOfLines={2}
                    left={() => (
                      <List.Icon icon="check-circle" color="#059669" />
                    )}
                    right={() => (
                      <Button
                        mode="text"
                        compact
                        onPress={() => toggleItem(item.id)}
                        textColor={theme.colors.onSurfaceVariant}
                        accessibilityLabel="Mark as pending"
                      >
                        Undo
                      </Button>
                    )}
                    titleStyle={{ fontWeight: '600', fontSize: 13, color: theme.colors.onSurfaceVariant }}
                    descriptionStyle={{ fontSize: 12, color: theme.colors.outline }}
                    style={[styles.listItem, { opacity: 0.7 }]}
                  />
                  {idx < complete.length - 1 && <Divider />}
                </View>
              ))}
            </Card>
          </>
        )}

        <Button
          mode="contained"
          icon="transfer"
          onPress={() => navigation.goBack()}
          style={styles.handoverBtn}
          accessibilityLabel="Sign off handover and go back"
        >
          Sign off handover
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  pendingChip: { backgroundColor: '#fffbeb' },
  aiSummaryCard: { borderRadius: 12, backgroundColor: '#f5f3ff' },
  aiSummaryContent: { gap: 8 },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiSummaryIcon: { fontSize: 16, color: '#7c3aed' },
  aiSummaryLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  aiSummaryText: { fontSize: 13, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -4 },
  listCard: { borderRadius: 12 },
  listItem: { paddingRight: 8 },
  doneBtn: { alignSelf: 'center' },
  handoverBtn: { marginTop: 8, paddingVertical: 4 },
});
