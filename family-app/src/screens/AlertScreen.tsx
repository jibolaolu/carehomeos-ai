import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

type AlertSeverity = 'urgent' | 'important' | 'info' | 'resolved';

type FamilyAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  sentAt: string;
  acknowledged: boolean;
  requiresAction: boolean;
};

const INITIAL_ALERTS: FamilyAlert[] = [
  {
    id: 'fa1',
    severity: 'important',
    title: 'GP visit on Thursday',
    body: 'Margaret\'s GP, Dr. Okafor, will be visiting Oakfield House on Thursday 3 July at 10:00. You are welcome to join the appointment by video call. Please contact the home to confirm your participation.',
    sentAt: 'Yesterday, 16:30',
    acknowledged: false,
    requiresAction: true,
  },
  {
    id: 'fa2',
    severity: 'info',
    title: 'Pressure area — monitoring update',
    body: 'Following the district nurse review, Margaret\'s heel pressure area has been re-graded as Grade 1 (minor redness). Her repositioning plan has been updated to 2-hourly turns. The next nurse review is in 3 days. No immediate concern — we are monitoring closely.',
    sentAt: 'Yesterday, 15:00',
    acknowledged: true,
    requiresAction: false,
  },
  {
    id: 'fa3',
    severity: 'resolved',
    title: 'Chest infection — fully resolved',
    body: 'We are pleased to confirm that Margaret\'s chest infection, which began on 10 June, has fully resolved. Her antibiotic course was completed on 24 June and the GP confirmed satisfactory recovery at the follow-up call.',
    sentAt: '25 Jun, 10:00',
    acknowledged: true,
    requiresAction: false,
  },
  {
    id: 'fa4',
    severity: 'info',
    title: 'Care plan reviewed',
    body: 'Margaret\'s six-monthly care plan review has been completed by the registered manager. Key updates: fluid intake target increased to 1,500ml daily, and a weekly wellbeing call with family has been added to her social activity plan. A copy of the updated plan can be requested from the home.',
    sentAt: '20 Jun, 11:00',
    acknowledged: true,
    requiresAction: false,
  },
];

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string; border: string; icon: string }> = {
  urgent:    { label: 'Urgent',    color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', icon: '🔴' },
  important: { label: 'Important', color: '#c2410c', bg: '#fff7ed', border: '#fdba74', icon: '🟠' },
  info:      { label: 'Info',      color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: '🔵' },
  resolved:  { label: 'Resolved',  color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
};

export function AlertScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<FamilyAlert[]>(INITIAL_ALERTS);

  const unread = alerts.filter((a) => !a.acknowledged && a.severity !== 'resolved').length;

  function acknowledge(id: string) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
  }

  function handleContactHome(alert: FamilyAlert) {
    Alert.alert(
      'Contact Oakfield House',
      `To discuss "${alert.title}", call the home directly:\n\n01234 567 890\n\nOr send a message via the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message team', onPress: () => navigation.navigate('FamilyMessages') },
        { text: 'Call home', onPress: () => {} },
      ],
    );
  }

  const activeAlerts = alerts.filter((a) => a.severity !== 'resolved');
  const resolvedAlerts = alerts.filter((a) => a.severity === 'resolved');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>CareHomeOS Family</Text>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.colors.onBackground }]}>Notifications</Text>
              {unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{unread}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Margaret Ellis · Oakfield House
            </Text>
          </View>
          <Button mode="text" compact onPress={() => navigation.goBack()} textColor={theme.colors.onSurfaceVariant} accessibilityLabel="Go back">
            Back
          </Button>
        </View>

        {unread === 0 && activeAlerts.length === 0 && (
          <Card style={[styles.noAlertCard, { backgroundColor: '#f0fdf4' }]}>
            <Card.Content style={styles.noAlertContent}>
              <Text style={styles.noAlertIcon}>✅</Text>
              <Text style={[styles.noAlertTitle, { color: '#059669' }]}>No urgent notifications</Text>
              <Text style={[styles.noAlertBody, { color: theme.colors.onSurfaceVariant }]}>
                The care team will notify you here if anything requires your attention.
              </Text>
            </Card.Content>
          </Card>
        )}

        {activeAlerts.length > 0 && (
          <View style={styles.section}>
            {activeAlerts.map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity];
              return (
                <Card key={alert.id} style={[styles.alertCard, { backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1.5 }]}>
                  <Card.Content style={styles.alertContent}>
                    <View style={styles.alertTop}>
                      <View style={styles.severityRow}>
                        <Text style={styles.severityIcon}>{cfg.icon}</Text>
                        <Text style={[styles.severityLabel, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <Text style={[styles.alertTime, { color: theme.colors.onSurfaceVariant }]}>{alert.sentAt}</Text>
                    </View>
                    <Text style={[styles.alertTitle, { color: theme.colors.onSurface }]}>{alert.title}</Text>
                    <Text style={[styles.alertBody, { color: theme.colors.onSurfaceVariant }]}>{alert.body}</Text>

                    {(alert.requiresAction || !alert.acknowledged) && (
                      <>
                        <Divider style={styles.alertDivider} />
                        <View style={styles.alertActions}>
                          {alert.requiresAction && (
                            <Button mode="contained" compact onPress={() => handleContactHome(alert)} accessibilityLabel="Contact care home" style={styles.contactBtn}>
                              Contact home
                            </Button>
                          )}
                          {!alert.acknowledged && (
                            <Button mode="text" compact onPress={() => acknowledge(alert.id)} textColor={theme.colors.onSurfaceVariant} accessibilityLabel="Mark as read">
                              Mark as read
                            </Button>
                          )}
                        </View>
                      </>
                    )}

                    {alert.acknowledged && !alert.requiresAction && (
                      <Chip icon="check" compact style={styles.readChip} textStyle={{ color: '#059669', fontSize: 11 }}>
                        Read
                      </Chip>
                    )}
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}

        {resolvedAlerts.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Resolved</Text>
            <View style={styles.section}>
              {resolvedAlerts.map((alert) => {
                const cfg = SEVERITY_CONFIG[alert.severity];
                return (
                  <Card key={alert.id} style={[styles.alertCard, { backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1 }]}>
                    <Card.Content style={styles.alertContent}>
                      <View style={styles.alertTop}>
                        <View style={styles.severityRow}>
                          <Text style={styles.severityIcon}>{cfg.icon}</Text>
                          <Text style={[styles.severityLabel, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        <Text style={[styles.alertTime, { color: theme.colors.onSurfaceVariant }]}>{alert.sentAt}</Text>
                      </View>
                      <Text style={[styles.alertTitle, { color: theme.colors.onSurfaceVariant }]}>{alert.title}</Text>
                      <Text style={[styles.alertBody, { color: theme.colors.onSurfaceVariant, opacity: 0.75 }]}>{alert.body}</Text>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  unreadBadge: {
    backgroundColor: '#dc2626', borderRadius: 999, minWidth: 22, height: 22,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  unreadCount: { color: '#fff', fontSize: 12, fontWeight: '800' },
  noAlertCard: { borderRadius: 12 },
  noAlertContent: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  noAlertIcon: { fontSize: 32 },
  noAlertTitle: { fontSize: 16, fontWeight: '800' },
  noAlertBody: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  section: { gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  alertCard: { borderRadius: 12 },
  alertContent: { gap: 8, paddingTop: 12 },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  severityIcon: { fontSize: 14 },
  severityLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  alertTime: { fontSize: 11, fontWeight: '600' },
  alertTitle: { fontSize: 15, fontWeight: '800', lineHeight: 21 },
  alertBody: { fontSize: 13, lineHeight: 21 },
  alertDivider: { marginVertical: 4 },
  alertActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  contactBtn: { flex: 1 },
  readChip: { alignSelf: 'flex-start', backgroundColor: '#f0fdf4', marginTop: 4 },
});
