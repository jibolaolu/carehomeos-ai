import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  FAB,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import OfflineIndicator from '../../components/OfflineIndicator';

type MedStatus = 'administered' | 'due' | 'refused' | 'omitted';

type MedEntry = {
  id: string;
  resident: string;
  room: string;
  medication: string;
  dose: string;
  route: string;
  time: string;
  status: MedStatus;
  notes?: string;
};

const INITIAL_MEDS: MedEntry[] = [
  { id: 'm1', resident: 'Margaret Ellis',  room: '101', medication: 'Memantine',   dose: '10mg',  route: 'Oral', time: '08:00', status: 'administered' },
  { id: 'm2', resident: 'George Patel',    room: '102', medication: 'Amlodipine',  dose: '5mg',   route: 'Oral', time: '08:00', status: 'administered' },
  { id: 'm3', resident: 'Evelyn Morgan',   room: '103', medication: 'Paracetamol', dose: '1g',    route: 'Oral', time: '10:00', status: 'due' },
  { id: 'm4', resident: 'Evelyn Morgan',   room: '103', medication: 'Lorazepam',   dose: '0.5mg', route: 'SL',   time: '10:00', status: 'due', notes: 'PRN – administer only if agitation score ≥ 3' },
  { id: 'm5', resident: 'Margaret Ellis',  room: '101', medication: 'Aspirin',     dose: '75mg',  route: 'Oral', time: '12:00', status: 'due' },
  { id: 'm6', resident: 'George Patel',    room: '102', medication: 'Metformin',   dose: '500mg', route: 'Oral', time: '08:00', status: 'refused', notes: 'Resident refused at breakfast' },
];

const STATUS_COLORS: Record<MedStatus, string> = {
  administered: '#059669',
  due:          '#d97706',
  refused:      '#dc2626',
  omitted:      '#6b7280',
};

const STATUS_BG: Record<MedStatus, string> = {
  administered: '#ecfdf5',
  due:          '#fffbeb',
  refused:      '#fef2f2',
  omitted:      '#f1f5f9',
};

export default function MARScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const [meds, setMeds] = useState<MedEntry[]>(INITIAL_MEDS);
  const [confirming, setConfirming] = useState<string | null>(null);

  const dueCount = meds.filter((m) => m.status === 'due').length;
  const adminCount = meds.filter((m) => m.status === 'administered').length;

  async function confirmAdminister(id: string) {
    setConfirming(id);
    await new Promise((r) => setTimeout(r, 700));
    setMeds((prev) => prev.map((m) => m.id === id ? { ...m, status: 'administered' } : m));
    setConfirming(null);
  }

  function handleAdminister(entry: MedEntry) {
    Alert.alert(
      'Confirm administration',
      `Administer ${entry.medication} ${entry.dose} (${entry.route}) to ${entry.resident}?\n\n${entry.notes ?? ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'default', onPress: () => void confirmAdminister(entry.id) },
      ],
    );
  }

  function handleRefuse(entry: MedEntry) {
    Alert.prompt?.(
      'Record refusal',
      `Reason ${entry.resident} refused ${entry.medication}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: (reason) =>
            setMeds((prev) => prev.map((m) => m.id === entry.id ? { ...m, status: 'refused', notes: reason ?? 'No reason given' } : m)),
        },
      ],
    ) ?? setMeds((prev) => prev.map((m) => m.id === entry.id ? { ...m, status: 'refused' } : m));
  }

  const grouped = meds.reduce<Record<string, MedEntry[]>>((acc, m) => {
    if (!acc[m.resident]) acc[m.resident] = [];
    acc[m.resident].push(m);
    return acc;
  }, {});

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Medication round</Text>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>MAR chart</Text>
          </View>
          <View style={styles.summaryPills}>
            <Chip icon="check-circle" textStyle={{ color: '#059669' }} style={styles.chipGreen}>{adminCount} done</Chip>
            <Chip icon="clock-alert" textStyle={{ color: '#d97706' }} style={styles.chipAmber}>{dueCount} due</Chip>
          </View>
        </View>

        {dueCount > 0 && (
          <Card style={[styles.alertBanner, { borderColor: '#fcd34d' }]}>
            <Card.Content style={styles.alertBannerContent}>
              <Text style={styles.alertBannerText}>⚠ {dueCount} medication{dueCount !== 1 ? 's' : ''} require administration</Text>
            </Card.Content>
          </Card>
        )}

        {Object.entries(grouped).map(([resident, entries]) => (
          <Card key={resident} style={styles.residentCard}>
            <Card.Title
              title={resident}
              subtitle={`Room ${entries[0].room}`}
              titleStyle={{ fontWeight: '700' }}
            />
            <Divider />
            {entries.map((entry, i) => (
              <View key={entry.id}>
                <Card.Content style={styles.medRow}>
                  <View style={styles.medInfo}>
                    <Text style={[styles.medName, { color: theme.colors.onSurface }]}>
                      {entry.medication} {entry.dose}
                    </Text>
                    <Text style={[styles.medMeta, { color: theme.colors.onSurfaceVariant }]}>
                      {entry.route} · {entry.time}
                    </Text>
                    {entry.notes ? (
                      <Text style={[styles.medNote, { color: theme.colors.error }]}>{entry.notes}</Text>
                    ) : null}
                  </View>
                  <View style={styles.medActions}>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[entry.status] }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[entry.status] }]}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Text>
                    </View>
                    {entry.status === 'due' && (
                      <View style={styles.actionButtons}>
                        {confirming === entry.id ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <>
                            <Button
                              mode="contained"
                              compact
                              onPress={() => handleAdminister(entry)}
                              style={styles.adminBtn}
                              accessibilityLabel={`Administer ${entry.medication} to ${entry.resident}`}
                            >
                              Give
                            </Button>
                            <Button
                              mode="outlined"
                              compact
                              onPress={() => handleRefuse(entry)}
                              style={styles.refuseBtn}
                              textColor={theme.colors.error}
                              accessibilityLabel={`Record refusal for ${entry.medication}`}
                            >
                              Refuse
                            </Button>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </Card.Content>
                {i < entries.length - 1 && <Divider style={styles.innerDivider} />}
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>

      <FAB
        icon="arrow-left"
        label="Back"
        style={[styles.fab, { backgroundColor: theme.colors.surfaceVariant }]}
        color={theme.colors.onSurfaceVariant}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Go back"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  summaryPills: { gap: 6 },
  chipGreen: { backgroundColor: '#ecfdf5' },
  chipAmber: { backgroundColor: '#fffbeb' },
  alertBanner: { borderWidth: 1, borderRadius: 10 },
  alertBannerContent: { paddingVertical: 10 },
  alertBannerText: { color: '#92400e', fontWeight: '700', fontSize: 13 },
  residentCard: { borderRadius: 12, marginTop: 4 },
  medRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, gap: 10, alignItems: 'flex-start' },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: '700' },
  medMeta: { fontSize: 12, marginTop: 3 },
  medNote: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  medActions: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800' },
  actionButtons: { flexDirection: 'row', gap: 6 },
  adminBtn: { height: 32 },
  refuseBtn: { height: 32 },
  innerDivider: { marginHorizontal: 16 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 16 },
});
