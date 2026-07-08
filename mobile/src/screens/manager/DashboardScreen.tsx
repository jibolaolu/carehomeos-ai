import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  List,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import OfflineIndicator from '../../components/OfflineIndicator';
import { useAuthStore } from '../../stores/authStore';

type KPI = { label: string; value: string; sub: string; color: string; bg: string; trend?: 'up' | 'down' | 'flat' };

const KPIS: KPI[] = [
  { label: 'Residents', value: '28',   sub: '3 high-risk',       color: '#1d4ed8', bg: '#eff6ff', trend: 'flat' },
  { label: 'eMAR',      value: '14/18', sub: '4 due',             color: '#059669', bg: '#f0fdf4', trend: 'up'  },
  { label: 'CQC score', value: '87%',   sub: '+2% this month',   color: '#7c3aed', bg: '#f5f3ff', trend: 'up'  },
  { label: 'Incidents', value: '2',     sub: '1 open RCA',        color: '#d97706', bg: '#fffbeb', trend: 'down'},
  { label: 'Staff on',  value: '7',     sub: 'of 10 required',   color: '#0369a1', bg: '#e0f2fe', trend: 'flat'},
  { label: 'Training',  value: '91%',   sub: 'compliance',        color: '#059669', bg: '#f0fdf4', trend: 'up'  },
];

const OPEN_ALERTS = [
  { id: 'a1', label: 'Safeguarding disclosure', severity: 'critical', resident: 'Resident A',     time: '09:14' },
  { id: 'a2', label: 'Deterioration — NEWS2 4', severity: 'high',     resident: 'Evelyn Morgan',  time: '10:02' },
  { id: 'a3', label: 'Falls observation due',   severity: 'high',     resident: 'Margaret Ellis', time: '11:00' },
];

const CQC_DOMAINS = [
  { label: 'Safe',        score: 88 },
  { label: 'Effective',   score: 91 },
  { label: 'Caring',      score: 95 },
  { label: 'Responsive',  score: 82 },
  { label: 'Well-led',    score: 79 },
];

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#b91c1c',
  high:     '#c2410c',
  medium:   '#b45309',
};

export default function ManagerDashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { logout } = useAuthStore();
  const [refreshing] = useState(false);

  const criticalCount = OPEN_ALERTS.filter((a) => a.severity === 'critical').length;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Registered manager</Text>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>Overview</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Oakfield House · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <Button mode="text" compact onPress={logout} textColor={theme.colors.onSurfaceVariant} accessibilityLabel="Sign out">
            Sign out
          </Button>
        </View>

        {criticalCount > 0 && (
          <Card style={styles.criticalBanner}>
            <Card.Content style={styles.criticalContent}>
              <Text style={styles.criticalText}>🔴 {criticalCount} critical alert{criticalCount !== 1 ? 's' : ''} require immediate attention</Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.kpiGrid}>
          {KPIS.map((kpi) => (
            <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: kpi.bg }]}>
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={[styles.kpiLabel, { color: kpi.color }]}>{kpi.label}</Text>
              <Text style={styles.kpiSub}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        <Card style={styles.card}>
          <Card.Title
            title="Open alerts"
            titleStyle={{ fontSize: 15, fontWeight: '700' }}
            right={() => <Badge style={styles.alertBadge}>{OPEN_ALERTS.length}</Badge>}
          />
          <Divider />
          {OPEN_ALERTS.map((alert, idx) => (
            <View key={alert.id}>
              <List.Item
                title={alert.label}
                description={`${alert.resident} · ${alert.time}`}
                left={() => (
                  <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[alert.severity] }]} />
                )}
                right={() => (
                  <Chip compact textStyle={{ fontSize: 11, color: SEVERITY_COLOR[alert.severity] }} style={{ backgroundColor: '#fff5f5', alignSelf: 'center' }}>
                    {alert.severity}
                  </Chip>
                )}
                titleStyle={{ fontSize: 13, fontWeight: '700' }}
                descriptionStyle={{ fontSize: 11 }}
              />
              {idx < OPEN_ALERTS.length - 1 && <Divider />}
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Card.Title title="CQC readiness" subtitle="Single Assessment Framework" titleStyle={{ fontSize: 15, fontWeight: '700' }} subtitleStyle={{ fontSize: 12 }} />
          <Divider />
          <Card.Content style={styles.cqcContent}>
            {CQC_DOMAINS.map((domain) => {
              const color = domain.score >= 90 ? '#059669' : domain.score >= 80 ? '#d97706' : '#dc2626';
              return (
                <View key={domain.label} style={styles.cqcRow}>
                  <Text style={[styles.cqcLabel, { color: theme.colors.onSurface }]}>{domain.label}</Text>
                  <ProgressBar progress={domain.score / 100} color={color} style={styles.cqcBar} />
                  <Text style={[styles.cqcScore, { color }]}>{domain.score}%</Text>
                </View>
              );
            })}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.aiInsightContent}>
            <Text style={styles.aiInsightIcon}>✦</Text>
            <View style={styles.aiInsightText}>
              <Text style={[styles.aiInsightTitle, { color: '#3730a3' }]}>AI manager insight</Text>
              <Text style={[styles.aiInsightBody, { color: theme.colors.onSurfaceVariant }]}>
                Deterioration risk is elevated this week — 2 residents on watch. CQC Well-led domain has dipped below 80%. Consider scheduling a governance review. Safeguarding action required immediately.
              </Text>
            </View>
          </Card.Content>
        </Card>
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
  subtitle: { fontSize: 13, marginTop: 2 },
  criticalBanner: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 10 },
  criticalContent: { paddingVertical: 10 },
  criticalText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '47%', borderRadius: 12, padding: 14, gap: 3 },
  kpiValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  card: { borderRadius: 12 },
  alertBadge: { backgroundColor: '#dc2626', marginRight: 16, alignSelf: 'center' },
  severityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 16, marginLeft: 8 },
  cqcContent: { gap: 10, paddingTop: 12 },
  cqcRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cqcLabel: { width: 90, fontSize: 13, fontWeight: '600' },
  cqcBar: { flex: 1, height: 7, borderRadius: 4 },
  cqcScore: { width: 36, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  aiInsightContent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#f5f3ff', borderRadius: 8, paddingVertical: 14 },
  aiInsightIcon: { fontSize: 20, color: '#7c3aed', lineHeight: 26 },
  aiInsightText: { flex: 1, gap: 5 },
  aiInsightTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  aiInsightBody: { fontSize: 13, lineHeight: 20 },
});
