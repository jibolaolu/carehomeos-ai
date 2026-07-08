import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Badge,
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

type AlertSeverity = 'critical' | 'high' | 'medium' | 'resolved';

type CareAlert = {
  id: string;
  severity: AlertSeverity;
  type: string;
  resident: string;
  room: string;
  detail: string;
  time: string;
  acknowledged: boolean;
};

const INITIAL_ALERTS: CareAlert[] = [
  { id: 'a1', severity: 'critical', type: 'Safeguarding',    resident: 'Resident A', room: '105', detail: 'Disclosure of rough handling during personal care. Immediate review and Section 42 referral required.', time: '09:14', acknowledged: false },
  { id: 'a2', severity: 'high',     type: 'Deterioration',   resident: 'Evelyn Morgan', room: '103', detail: 'Pressure area grade 2 noted on left heel. Reduced oral intake this morning (< 300ml). NEWS2 score 4.', time: '10:02', acknowledged: false },
  { id: 'a3', severity: 'high',     type: 'Falls risk',      resident: 'Margaret Ellis', room: '101', detail: 'Post-fall observations due at 11:00. BP recording outstanding. District nurse called.', time: '08:30', acknowledged: false },
  { id: 'a4', severity: 'medium',   type: 'Medication',      resident: 'George Patel', room: '102', detail: 'Refused Metformin 500mg at breakfast. Second refusal this week — GP review recommended.', time: '08:12', acknowledged: false },
  { id: 'a5', severity: 'medium',   type: 'Fluid intake',    resident: 'Margaret Ellis', room: '101', detail: 'Only 200ml fluid intake by 10:00. Carer prompted twice. At risk of dehydration — monitor closely.', time: '10:30', acknowledged: true },
  { id: 'a6', severity: 'resolved', type: 'Chest infection', resident: 'George Patel', room: '102', detail: 'Antibiotics course completed. GP confirmed satisfactory progress at last visit.', time: 'Yesterday', acknowledged: true },
];

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', label: 'Critical' },
  high:     { color: '#c2410c', bg: '#fff7ed', border: '#fdba74', label: 'High'     },
  medium:   { color: '#b45309', bg: '#fffbeb', border: '#fcd34d', label: 'Medium'   },
  resolved: { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', label: 'Resolved' },
};

export default function AlertsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<CareAlert[]>(INITIAL_ALERTS);
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all');

  const unacknowledged = alerts.filter((a) => !a.acknowledged && a.severity !== 'resolved').length;

  function acknowledge(id: string) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
  }

  function escalate(alert: CareAlert) {
    Alert.alert(
      'Escalate alert',
      `Escalating: ${alert.type} — ${alert.resident}\n\nThis will notify the registered manager and create an incident record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Escalate', style: 'destructive', onPress: () => acknowledge(alert.id) },
      ],
    );
  }

  const filtered = filter === 'all'
    ? alerts.filter((a) => a.severity !== 'resolved')
    : filter === 'resolved'
    ? alerts.filter((a) => a.severity === 'resolved')
    : alerts.filter((a) => a.severity === filter);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Senior carer</Text>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.colors.onBackground }]}>Alerts</Text>
              {unacknowledged > 0 && (
                <Badge style={styles.badge} size={22}>{unacknowledged}</Badge>
              )}
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'critical', 'high', 'medium', 'resolved'] as const).map((s) => (
            <Chip
              key={s}
              selected={filter === s}
              onPress={() => setFilter(s)}
              compact
              style={[styles.filterChip, filter === s && { backgroundColor: theme.colors.primaryContainer }]}
              accessibilityLabel={`Filter by ${s}`}
            >
              {s === 'all' ? 'Active' : SEVERITY_CONFIG[s as AlertSeverity]?.label ?? s}
            </Chip>
          ))}
        </View>

        {filtered.map((alert) => {
          const cfg = SEVERITY_CONFIG[alert.severity];
          return (
            <Card
              key={alert.id}
              style={[styles.alertCard, { borderColor: cfg.border, backgroundColor: cfg.bg }]}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.alertTop}>
                  <View style={[styles.severityBadge, { backgroundColor: cfg.color }]}>
                    <Text style={styles.severityLabel}>{cfg.label}</Text>
                  </View>
                  <Text style={[styles.alertTime, { color: theme.colors.onSurfaceVariant }]}>{alert.time}</Text>
                </View>

                <Text style={[styles.alertType, { color: cfg.color }]}>{alert.type}</Text>
                <Text style={[styles.alertResident, { color: theme.colors.onSurface }]}>
                  {alert.resident} · Room {alert.room}
                </Text>
                <Text style={[styles.alertDetail, { color: theme.colors.onSurfaceVariant }]}>
                  {alert.detail}
                </Text>

                {!alert.acknowledged && alert.severity !== 'resolved' && (
                  <View style={styles.alertActions}>
                    {alert.severity === 'critical' && (
                      <Button
                        mode="contained"
                        compact
                        buttonColor="#b91c1c"
                        onPress={() => escalate(alert)}
                        style={styles.actionBtn}
                        accessibilityLabel={`Escalate ${alert.type} alert`}
                      >
                        Escalate
                      </Button>
                    )}
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => navigation.navigate('NoteReview', { alertId: alert.id })}
                      style={styles.actionBtn}
                      accessibilityLabel="Review note"
                    >
                      Review
                    </Button>
                    <Button
                      mode="text"
                      compact
                      onPress={() => acknowledge(alert.id)}
                      textColor={theme.colors.onSurfaceVariant}
                      style={styles.actionBtn}
                      accessibilityLabel="Acknowledge alert"
                    >
                      Acknowledge
                    </Button>
                  </View>
                )}

                {alert.acknowledged && alert.severity !== 'resolved' && (
                  <Chip icon="check" compact style={styles.ackChip} textStyle={{ color: '#059669', fontSize: 11 }}>
                    Acknowledged
                  </Chip>
                )}
              </Card.Content>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                No alerts in this category.
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="arrow-left"
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
  header: { marginTop: 8 },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  title: { fontSize: 28, fontWeight: '800' },
  badge: { backgroundColor: '#dc2626' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { height: 30 },
  alertCard: { borderRadius: 12, borderWidth: 1 },
  cardContent: { gap: 6 },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  severityLabel: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  alertTime: { fontSize: 11, fontWeight: '700' },
  alertType: { fontSize: 14, fontWeight: '800' },
  alertResident: { fontSize: 13, fontWeight: '700' },
  alertDetail: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  alertActions: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: { height: 32 },
  ackChip: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#f0fdf4' },
  emptyCard: { borderRadius: 12 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: 16 },
});
