import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  FAB,
  Card,
  Text,
  useTheme,
  Avatar,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import OfflineIndicator from '../../components/OfflineIndicator';
import LanguageSelector from '../../components/LanguageSelector';
import { getResidents, initDatabase, type Resident } from '../../services/db';

export default function CarerHomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDatabase().then(() => {
      getResidents()
        .then((data) => {
          if (data.length === 0) {
            setResidents([
              {
                id: 'r1',
                name: 'Margaret Ellis',
                room: '101',
                status: 'active',
                sync_status: 'synced',
                last_synced: new Date().toISOString(),
              },
              {
                id: 'r2',
                name: 'George Patel',
                room: '102',
                status: 'active',
                sync_status: 'synced',
                last_synced: new Date().toISOString(),
              },
              {
                id: 'r3',
                name: 'Evelyn Morgan',
                room: '103',
                status: 'active',
                sync_status: 'synced',
                last_synced: new Date().toISOString(),
              },
            ]);
          } else {
            setResidents(data);
          }
        })
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{t('carerHome.today')}</Text>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
              {t('carerHome.workspaceTitle')}
            </Text>
          </View>
          <LanguageSelector compact />
        </View>

        <View style={styles.quickActions}>
          <Button
            mode="contained"
            icon="microphone"
            onPress={() => navigation.navigate('RecordNote')}
            style={styles.actionButton}
            accessibilityLabel={t('carerHome.recordNote')}
          >
            {t('carerHome.recordNote')}
          </Button>
          <Button
            mode="outlined"
            icon="pill"
            onPress={() => navigation.navigate('MAR')}
            style={styles.actionButton}
            accessibilityLabel={t('carerHome.viewMar')}
          >
            {t('carerHome.viewMar')}
          </Button>
          <Button
            mode="outlined"
            icon="swap-horizontal"
            onPress={() => navigation.navigate('Handover')}
            style={styles.actionButton}
            accessibilityLabel={t('carerHome.handover')}
          >
            {t('carerHome.handover')}
          </Button>
          <Button
            mode="outlined"
            icon="account-group"
            onPress={() => {}}
            style={styles.actionButton}
            accessibilityLabel={t('carerHome.viewResidents')}
          >
            {t('carerHome.viewResidents')}
          </Button>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          {t('carerHome.myResidents')}
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : residents.length === 0 ? (
          <Text style={{ color: theme.colors.outline }}>{t('carerHome.noResidents')}</Text>
        ) : (
          residents.map((resident) => (
            <Card
              key={resident.id}
              style={styles.card}
              onPress={() => navigation.navigate('RecordNote', { residentId: resident.id })}
              accessibilityLabel={resident.name}
              accessibilityRole="button"
            >
              <Card.Title
                title={resident.name}
                subtitle={`Room ${resident.room}`}
                left={(props) => (
                  <Avatar.Text {...props} label={resident.name.charAt(0)} size={40} />
                )}
                right={(props) => (
                  <Avatar.Icon {...props} icon="chevron-right" size={32} style={{ backgroundColor: 'transparent' }} />
                )}
              />
              <Card.Content>
                <Text style={{ color: theme.colors.outline }}>
                  {t('recordNote.noteType')}: {t('recordNote.noteTypes.general')}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="microphone"
        label={t('carerHome.voiceNoteFab')}
        onPress={() => navigation.navigate('RecordNote')}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        accessibilityLabel={t('carerHome.voiceNoteFab')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  card: {
    marginTop: 4,
    borderRadius: 12,
  },
  loader: {
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    borderRadius: 16,
  },
});
