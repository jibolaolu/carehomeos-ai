import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Button, Card, Switch } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function FluidBalanceScreen() {
  const { t } = useTranslation();
  const [isIntake, setIsIntake] = useState(true);
  const [entries, setEntries] = useState<Array<{
    id: string;
    fluid_type: string;
    volume_ml: number;
    route: string;
    is_intake: boolean;
    time: string;
  }>>([]);

  const [form, setForm] = useState({
    fluid_type: '',
    volume_ml: '',
    route: 'oral',
  });

  const addEntry = () => {
    if (!form.fluid_type || !form.volume_ml) return;
    const newEntry = {
      id: Date.now().toString(),
      fluid_type: form.fluid_type,
      volume_ml: parseInt(form.volume_ml),
      route: form.route,
      is_intake: isIntake,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
    setEntries([...entries, newEntry]);
    setForm({ fluid_type: '', volume_ml: '', route: 'oral' });
  };

  const totalIntake = entries.filter((e) => e.is_intake).reduce((sum, e) => sum + e.volume_ml, 0);
  const totalOutput = entries.filter((e) => !e.is_intake).reduce((sum, e) => sum + e.volume_ml, 0);
  const balance = totalIntake - totalOutput;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Fluid Balance</Text>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue} style={{ color: '#3B82F6' }}>{totalIntake}ml</Text>
              <Text style={styles.summaryLabel}>Intake</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue} style={{ color: '#EF4444' }}>{totalOutput}ml</Text>
              <Text style={styles.summaryLabel}>Output</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: balance >= 0 ? '#10B981' : '#F59E0B' }]}>
                {balance >= 0 ? '+' : ''}{balance}ml
              </Text>
              <Text style={styles.summaryLabel}>Balance</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.typeRow}>
            <Text style={styles.typeLabel}>Type:</Text>
            <View style={styles.typeToggle}>
              <Button
                mode={isIntake ? 'contained' : 'outlined'}
                onPress={() => setIsIntake(true)}
                style={styles.typeButton}
              >
                Intake
              </Button>
              <Button
                mode={!isIntake ? 'contained' : 'outlined'}
                onPress={() => setIsIntake(false)}
                style={styles.typeButton}
              >
                Output
              </Button>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Fluid type (e.g., Water, Tea, Urine)"
            value={form.fluid_type}
            onChangeText={(text) => setForm({ ...form, fluid_type: text })}
            accessibilityLabel="Fluid type"
          />

          <TextInput
            style={styles.input}
            placeholder="Volume (ml)"
            keyboardType="numeric"
            value={form.volume_ml}
            onChangeText={(text) => setForm({ ...form, volume_ml: text })}
            accessibilityLabel="Volume in millilitres"
          />

          <TextInput
            style={styles.input}
            placeholder="Route (oral, IV, catheter, etc.)"
            value={form.route}
            onChangeText={(text) => setForm({ ...form, route: text })}
            accessibilityLabel="Route of administration"
          />

          <Button mode="contained" onPress={addEntry} style={styles.addButton}>
            Add Entry
          </Button>
        </Card.Content>
      </Card>

      <Text style={styles.entriesTitle}>Today's Entries</Text>
      {entries.map((entry) => (
        <Card key={entry.id} style={styles.entryCard}>
          <Card.Content style={styles.entryContent}>
            <View>
              <Text style={styles.entryType}>{entry.fluid_type}</Text>
              <Text style={styles.entryRoute}>{entry.route} • {entry.time}</Text>
            </View>
            <Text style={[styles.entryVolume, { color: entry.is_intake ? '#3B82F6' : '#EF4444' }]}>
              {entry.is_intake ? '+' : '-'}{entry.volume_ml}ml
            </Text>
          </Card.Content>
        </Card>
      ))}

      {entries.length === 0 && (
        <Text style={styles.emptyText}>No entries yet. Add your first fluid record above.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  summaryCard: { marginBottom: 16, backgroundColor: '#F0F9FF' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  card: { marginBottom: 16 },
  typeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  typeLabel: { fontSize: 16, fontWeight: '600', marginRight: 12 },
  typeToggle: { flexDirection: 'row', gap: 8, flex: 1 },
  typeButton: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  addButton: { marginTop: 8 },
  entriesTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  entryCard: { marginBottom: 8 },
  entryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryType: { fontSize: 16, fontWeight: '500' },
  entryRoute: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  entryVolume: { fontSize: 18, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 24 },
});
