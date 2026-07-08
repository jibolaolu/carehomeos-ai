import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';

const RESIDENT = {
  name: 'Margaret Ellis',
  room: '101',
  careHome: 'Oakfield House',
  keyWorker: 'Amara O.',
  lastUpdate: 'Today at 11:45',
};

const WELLBEING_SUMMARY = [
  { label: 'Mood',       value: 'Calm',   icon: '😊', color: '#059669', bg: '#f0fdf4' },
  { label: 'Nutrition',  value: 'Fair',   icon: '🍽️', color: '#d97706', bg: '#fffbeb' },
  { label: 'Activity',   value: 'Active', icon: '🎵', color: '#059669', bg: '#f0fdf4' },
  { label: 'Sleep',      value: 'Good',   icon: '🌙', color: '#059669', bg: '#f0fdf4' },
];

const QUICK_ACTIONS = [
  { label: 'View updates',  screen: 'FamilyUpdates', icon: '📋' },
  { label: 'Messages',      screen: 'FamilyMessages', icon: '💬' },
  { label: 'Alerts',        screen: 'FamilyAlerts',  icon: '🔔' },
];

export function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const greeting = getGreeting();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>CareHomeOS Family</Text>
            <Text style={[styles.greeting, { color: theme.colors.onBackground }]}>
              {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {RESIDENT.careHome} · Updated {RESIDENT.lastUpdate}
            </Text>
          </View>
          <Button mode="text" compact onPress={logout} textColor={theme.colors.onSurfaceVariant} accessibilityLabel="Sign out">
            Sign out
          </Button>
        </View>

        <Card style={styles.residentCard}>
          <Card.Content style={styles.residentContent}>
            <View style={styles.residentAvatar}>
              <Text style={styles.avatarInitials}>
                {RESIDENT.name.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.residentInfo}>
              <Text style={[styles.residentName, { color: theme.colors.onSurface }]}>{RESIDENT.name}</Text>
              <Text style={[styles.residentMeta, { color: theme.colors.onSurfaceVariant }]}>
                Room {RESIDENT.room} · Key worker: {RESIDENT.keyWorker}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.wellbeingGrid}>
          {WELLBEING_SUMMARY.map((item) => (
            <View key={item.label} style={[styles.wellbeingCard, { backgroundColor: item.bg }]}>
              <Text style={styles.wellbeingIcon}>{item.icon}</Text>
              <Text style={[styles.wellbeingValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[styles.wellbeingLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.latestContent}>
            <View style={styles.latestHeader}>
              <Chip compact icon="clock" style={{ backgroundColor: '#f1f5f9' }} textStyle={{ fontSize: 11 }}>
                Latest update
              </Chip>
            </View>
            <Text style={[styles.latestNote, { color: theme.colors.onSurface }]}>
              Margaret enjoyed the music group this morning and engaged well with the other residents. She accepted a fortified drink after breakfast. The care team will continue to prompt her with fluids through the afternoon shift.
            </Text>
            <Divider style={styles.divider} />
            <Text style={[styles.noteCredit, { color: theme.colors.onSurfaceVariant }]}>
              Noted by Amara O. · {RESIDENT.keyWorker} · {RESIDENT.lastUpdate}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.screen}
              mode="outlined"
              icon={() => <Text style={styles.actionIcon}>{action.icon}</Text>}
              onPress={() => navigation.navigate(action.screen)}
              style={styles.actionBtn}
              contentStyle={styles.actionContent}
              accessibilityLabel={`Go to ${action.label}`}
            >
              {action.label}
            </Button>
          ))}
        </View>

        <Card style={styles.contactCard}>
          <Card.Content style={styles.contactContent}>
            <Text style={[styles.contactTitle, { color: theme.colors.onSurface }]}>
              Speak to the team
            </Text>
            <Text style={[styles.contactBody, { color: theme.colors.onSurfaceVariant }]}>
              For urgent clinical concerns, call the home directly. For general enquiries, use the in-app messages.
            </Text>
            <View style={styles.contactRow}>
              <Button mode="contained" icon="phone" onPress={() => {}} accessibilityLabel="Call care home" style={styles.callBtn}>
                Call home
              </Button>
              <Button mode="outlined" icon="message" onPress={() => navigation.navigate('FamilyMessages')} accessibilityLabel="Send a message" style={styles.msgBtn}>
                Message
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  greeting: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { fontSize: 13, marginTop: 2 },
  residentCard: { borderRadius: 12 },
  residentContent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  residentAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 18, fontWeight: '800', color: '#7c3aed' },
  residentInfo: { flex: 1, gap: 3 },
  residentName: { fontSize: 16, fontWeight: '800' },
  residentMeta: { fontSize: 12 },
  wellbeingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wellbeingCard: { width: '47%', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  wellbeingIcon: { fontSize: 24 },
  wellbeingValue: { fontSize: 16, fontWeight: '800' },
  wellbeingLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  card: { borderRadius: 12 },
  latestContent: { gap: 10, paddingTop: 14 },
  latestHeader: { flexDirection: 'row' },
  latestNote: { fontSize: 14, lineHeight: 22 },
  divider: { marginVertical: 4 },
  noteCredit: { fontSize: 12 },
  quickActions: { gap: 10 },
  actionBtn: { borderRadius: 10 },
  actionContent: { paddingVertical: 4 },
  actionIcon: { fontSize: 16 },
  contactCard: { borderRadius: 12, backgroundColor: '#f8fafc' },
  contactContent: { gap: 10, paddingTop: 14 },
  contactTitle: { fontSize: 15, fontWeight: '800' },
  contactBody: { fontSize: 13, lineHeight: 20 },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  callBtn: { flex: 1 },
  msgBtn: { flex: 1 },
});
