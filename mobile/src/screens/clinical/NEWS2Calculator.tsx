import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Divider,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { saveVitals } from '../../services/db';

type Vitals = {
  systolic_bp: string;
  pulse_rate: string;
  respiration_rate: string;
  spo2_percent: string;
  temperature_celsius: string;
  consciousness_level: 'A' | 'V' | 'P' | 'U';
};

function scoreRR(v: number) {
  if (v <= 8) return 3;
  if (v <= 11) return 1;
  if (v <= 20) return 0;
  if (v <= 24) return 2;
  return 3;
}
function scoreSPO2(v: number) {
  if (v <= 91) return 3;
  if (v <= 93) return 2;
  if (v <= 95) return 1;
  return 0;
}
function scoreSBP(v: number) {
  if (v <= 90) return 3;
  if (v <= 100) return 2;
  if (v <= 110) return 1;
  if (v >= 220) return 3;
  return 0;
}
function scorePulse(v: number) {
  if (v <= 40) return 3;
  if (v <= 50) return 1;
  if (v <= 90) return 0;
  if (v <= 110) return 1;
  if (v <= 130) return 2;
  return 3;
}
function scoreTemp(v: number) {
  if (v <= 35.0) return 3;
  if (v <= 36.0) return 1;
  if (v <= 38.0) return 0;
  if (v <= 39.0) return 1;
  return 2;
}

function calcNEWS2(v: Vitals): { total: number; breakdown: Record<string, number> } {
  const rr    = scoreRR(parseInt(v.respiration_rate) || 0);
  const spo2  = scoreSPO2(parseInt(v.spo2_percent) || 99);
  const sbp   = scoreSBP(parseInt(v.systolic_bp) || 120);
  const pulse = scorePulse(parseInt(v.pulse_rate) || 80);
  const avpu  = v.consciousness_level !== 'A' ? 3 : 0;
  const temp  = scoreTemp(parseFloat(v.temperature_celsius) || 36.5);
  return {
    total: rr + spo2 + sbp + pulse + avpu + temp,
    breakdown: { 'Resp rate': rr, 'SpO2': spo2, 'Systolic BP': sbp, 'Pulse': pulse, 'AVPU': avpu, 'Temp': temp },
  };
}

function riskLabel(score: number): { label: string; action: string; color: string; bg: string } {
  if (score <= 4) return { label: 'Low risk',    color: '#059669', bg: '#f0fdf4', action: 'Continue routine monitoring. Minimum 12-hourly obs.' };
  if (score <= 6) return { label: 'Medium risk', color: '#d97706', bg: '#fffbeb', action: 'Inform registered nurse immediately. Increase obs to minimum 4-hourly.' };
  return            { label: 'High risk',   color: '#b91c1c', bg: '#fef2f2', action: 'URGENT — contact GP or emergency services NOW. Continuous monitoring required.' };
}

export default function NEWS2Calculator() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const residentId = route.params?.residentId ?? 'unknown';
  const residentName = route.params?.residentName ?? 'Resident';

  const [vitals, setVitals] = useState<Vitals>({
    systolic_bp: '',
    pulse_rate: '',
    respiration_rate: '',
    spo2_percent: '',
    temperature_celsius: '',
    consciousness_level: 'A',
  });
  const [result, setResult] = useState<{ total: number; breakdown: Record<string, number> } | null>(null);
  const [saving, setSaving] = useState(false);

  function set(field: keyof Vitals, value: string | 'A' | 'V' | 'P' | 'U') {
    setVitals((prev) => ({ ...prev, [field]: value }));
    setResult(null);
  }

  function calculate() {
    const fields = ['systolic_bp', 'pulse_rate', 'respiration_rate', 'spo2_percent', 'temperature_celsius'] as const;
    const missing = fields.filter((f) => !vitals[f]);
    if (missing.length > 0) {
      Alert.alert('Missing values', 'Please enter all vital signs before calculating.');
      return;
    }
    const r = calcNEWS2(vitals);
    setResult(r);
    if (r.total >= 7) Alert.alert('CRITICAL NEWS2', `Score: ${r.total}\n\nEmergency response required immediately.`);
    else if (r.total >= 5) Alert.alert('High NEWS2', `Score: ${r.total}\n\nUrgent clinical review required.`);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await saveVitals({
        id: `vitals-${Date.now()}`,
        resident_id: residentId,
        systolic_bp: parseInt(vitals.systolic_bp),
        diastolic_bp: 0,
        pulse_rate: parseInt(vitals.pulse_rate),
        respiration_rate: parseInt(vitals.respiration_rate),
        spo2_percent: parseInt(vitals.spo2_percent),
        temperature_celsius: parseFloat(vitals.temperature_celsius),
        consciousness_level: vitals.consciousness_level,
        news2_score: result.total,
        recorded_at: new Date().toISOString(),
        sync_status: 'pending',
        sync_error: null,
      });
      Alert.alert('Saved', 'Vital signs and NEWS2 score recorded.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save vitals. They will sync when online.');
    } finally {
      setSaving(false);
    }
  }

  const risk = result ? riskLabel(result.total) : null;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Clinical</Text>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>NEWS2 Score</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{residentName}</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Blood pressure (systolic)</Text>
            <TextInput mode="outlined" label="Systolic BP (mmHg)" keyboardType="numeric" value={vitals.systolic_bp} onChangeText={(v) => set('systolic_bp', v)} style={styles.input} accessibilityLabel="Systolic blood pressure" />

            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Pulse rate</Text>
            <TextInput mode="outlined" label="Pulse (bpm)" keyboardType="numeric" value={vitals.pulse_rate} onChangeText={(v) => set('pulse_rate', v)} style={styles.input} accessibilityLabel="Pulse rate" />

            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Respiration rate</Text>
            <TextInput mode="outlined" label="Resp rate (breaths/min)" keyboardType="numeric" value={vitals.respiration_rate} onChangeText={(v) => set('respiration_rate', v)} style={styles.input} accessibilityLabel="Respiration rate" />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>SpO2 (%)</Text>
                <TextInput mode="outlined" label="SpO2 %" keyboardType="numeric" value={vitals.spo2_percent} onChangeText={(v) => set('spo2_percent', v)} accessibilityLabel="Oxygen saturation" />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Temperature (°C)</Text>
                <TextInput mode="outlined" label="Temp °C" keyboardType="decimal-pad" value={vitals.temperature_celsius} onChangeText={(v) => set('temperature_celsius', v)} accessibilityLabel="Temperature" />
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Consciousness (AVPU)</Text>
            <SegmentedButtons
              value={vitals.consciousness_level}
              onValueChange={(v) => set('consciousness_level', v as 'A' | 'V' | 'P' | 'U')}
              buttons={[
                { value: 'A', label: 'Alert' },
                { value: 'V', label: 'Voice' },
                { value: 'P', label: 'Pain' },
                { value: 'U', label: 'Unresponsive' },
              ]}
              style={styles.avpu}
            />
          </Card.Content>
        </Card>

        <Button mode="contained" onPress={calculate} style={styles.calcBtn} accessibilityLabel="Calculate NEWS2 score">
          Calculate NEWS2
        </Button>

        {result && risk && (
          <Card style={[styles.resultCard, { backgroundColor: risk.bg, borderColor: risk.color, borderWidth: 1.5 }]}>
            <Card.Content style={styles.resultContent}>
              <Text style={[styles.resultScore, { color: risk.color }]}>{result.total}</Text>
              <Text style={[styles.resultLabel, { color: risk.color }]}>{risk.label}</Text>
              <Text style={[styles.resultAction, { color: theme.colors.onSurfaceVariant }]}>{risk.action}</Text>
              <Divider style={styles.resultDivider} />
              <Text style={[styles.breakdownTitle, { color: theme.colors.onSurfaceVariant }]}>Score breakdown</Text>
              <View style={styles.breakdown}>
                {Object.entries(result.breakdown).map(([k, v]) => (
                  <View key={k} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownKey, { color: theme.colors.onSurface }]}>{k}</Text>
                    <Text style={[styles.breakdownVal, { color: v > 0 ? risk.color : theme.colors.onSurfaceVariant }]}>+{v}</Text>
                  </View>
                ))}
              </View>
              <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveBtn} accessibilityLabel="Save vitals and NEWS2 score">
                Save to resident record
              </Button>
            </Card.Content>
          </Card>
        )}

        <Button mode="text" onPress={() => navigation.goBack()} textColor={theme.colors.onSurfaceVariant} accessibilityLabel="Go back">
          Back
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { marginTop: 8 },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { fontSize: 14, marginTop: 2 },
  card: { borderRadius: 12 },
  cardContent: { gap: 4, paddingTop: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, marginTop: 8 },
  input: { marginBottom: 4 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  avpu: { marginTop: 4 },
  calcBtn: { paddingVertical: 4 },
  resultCard: { borderRadius: 12 },
  resultContent: { alignItems: 'center', gap: 8, paddingVertical: 14 },
  resultScore: { fontSize: 64, fontWeight: '900', lineHeight: 72 },
  resultLabel: { fontSize: 20, fontWeight: '800' },
  resultAction: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  resultDivider: { width: '100%', marginVertical: 4 },
  breakdownTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, alignSelf: 'flex-start' },
  breakdown: { width: '100%', gap: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownKey: { fontSize: 13 },
  breakdownVal: { fontSize: 13, fontWeight: '800' },
  saveBtn: { marginTop: 8, width: '100%' },
});
