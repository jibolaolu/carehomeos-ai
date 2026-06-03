import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function VitalsEntryScreen() {
  const { t } = useTranslation();
  const [vitals, setVitals] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    pulse_rate: '',
    respiration_rate: '',
    spo2_percent: '',
    temperature_celsius: '',
    consciousness_level: 'A',
    pain_score: '',
  });
  const [news2, setNews2] = useState<number | null>(null);

  const calculateNEWS2 = () => {
    let score = 0;
    const sbp = parseInt(vitals.systolic_bp);
    const pulse = parseInt(vitals.pulse_rate);
    const resp = parseInt(vitals.respiration_rate);
    const spo2 = parseInt(vitals.spo2_percent);
    const temp = parseFloat(vitals.temperature_celsius);

    if (resp <= 8) score += 3;
    else if (resp <= 11) score += 1;
    else if (resp <= 20) score += 0;
    else if (resp <= 24) score += 2;
    else score += 3;

    if (spo2 <= 91) score += 3;
    else if (spo2 <= 93) score += 2;
    else if (spo2 <= 95) score += 1;

    if (sbp <= 90) score += 3;
    else if (sbp <= 100) score += 2;
    else if (sbp <= 110) score += 1;
    else if (sbp >= 220) score += 3;

    if (pulse <= 40) score += 3;
    else if (pulse <= 50) score += 1;
    else if (pulse <= 90) score += 0;
    else if (pulse <= 110) score += 1;
    else if (pulse <= 130) score += 2;
    else score += 3;

    if (vitals.consciousness_level !== 'A') score += 3;

    if (temp <= 35.0) score += 3;
    else if (temp <= 36.0) score += 1;
    else if (temp <= 38.0) score += 0;
    else if (temp <= 39.0) score += 1;
    else score += 2;

    setNews2(score);

    if (score >= 7) {
      Alert.alert('CRITICAL NEWS2 Score', `Score: ${score}. Emergency response required.`, [{ text: 'OK' }]);
    } else if (score >= 5) {
      Alert.alert('High NEWS2 Score', `Score: ${score}. Urgent clinical review required.`, [{ text: 'OK' }]);
    }
  };

  const getRiskColor = () => {
    if (news2 === null) return '#6B7280';
    if (news2 <= 4) return '#10B981';
    if (news2 <= 6) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Vital Signs Entry</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Blood Pressure</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Systolic"
              keyboardType="numeric"
              value={vitals.systolic_bp}
              onChangeText={(text) => setVitals({ ...vitals, systolic_bp: text })}
              accessibilityLabel="Systolic blood pressure"
            />
            <Text style={styles.separator}>/</Text>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Diastolic"
              keyboardType="numeric"
              value={vitals.diastolic_bp}
              onChangeText={(text) => setVitals({ ...vitals, diastolic_bp: text })}
              accessibilityLabel="Diastolic blood pressure"
            />
          </View>

          <Text style={styles.sectionTitle}>Pulse & Respiration</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Pulse (bpm)"
              keyboardType="numeric"
              value={vitals.pulse_rate}
              onChangeText={(text) => setVitals({ ...vitals, pulse_rate: text })}
              accessibilityLabel="Pulse rate"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Respiration"
              keyboardType="numeric"
              value={vitals.respiration_rate}
              onChangeText={(text) => setVitals({ ...vitals, respiration_rate: text })}
              accessibilityLabel="Respiration rate"
            />
          </View>

          <Text style={styles.sectionTitle}>SpO2 & Temperature</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="SpO2 %"
              keyboardType="numeric"
              value={vitals.spo2_percent}
              onChangeText={(text) => setVitals({ ...vitals, spo2_percent: text })}
              accessibilityLabel="Oxygen saturation"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Temp °C"
              keyboardType="decimal-pad"
              value={vitals.temperature_celsius}
              onChangeText={(text) => setVitals({ ...vitals, temperature_celsius: text })}
              accessibilityLabel="Body temperature"
            />
          </View>

          <Text style={styles.sectionTitle}>Consciousness (AVPU)</Text>
          <View style={styles.avpuRow}>
            {['A', 'V', 'P', 'U'].map((level) => (
              <Button
                key={level}
                mode={vitals.consciousness_level === level ? 'contained' : 'outlined'}
                onPress={() => setVitals({ ...vitals, consciousness_level: level })}
                style={styles.avpuButton}
                accessibilityLabel={`Consciousness level ${level}`}
              >
                {level}
              </Button>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Pain Score (0-10)</Text>
          <TextInput
            style={styles.input}
            placeholder="Pain score"
            keyboardType="numeric"
            value={vitals.pain_score}
            onChangeText={(text) => setVitals({ ...vitals, pain_score: text })}
            accessibilityLabel="Pain score"
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={calculateNEWS2}
        style={styles.calculateButton}
        accessibilityLabel="Calculate NEWS2 score"
      >
        Calculate NEWS2
      </Button>

      {news2 !== null && (
        <Card style={[styles.news2Card, { borderColor: getRiskColor() }]}>
          <Card.Content>
            <Text style={[styles.news2Score, { color: getRiskColor() }]}>{news2}</Text>
            <Text style={styles.news2Label}>
              {news2 <= 4 ? 'Low Risk' : news2 <= 6 ? 'Medium Risk' : 'High Risk'}
            </Text>
            <Text style={styles.news2Action}>
              {news2 <= 4
                ? 'Continue routine monitoring'
                : news2 <= 6
                ? 'Inform registered nurse immediately'
                : 'Urgent response required - contact GP or emergency services'}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        onPress={() => {}}
        style={styles.saveButton}
        accessibilityLabel="Save vital signs"
      >
        Save Vital Signs
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8, color: '#374151' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  halfInput: { flex: 1 },
  separator: { fontSize: 18, fontWeight: 'bold', color: '#6B7280' },
  avpuRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  avpuButton: { flex: 1 },
  calculateButton: { marginBottom: 16, paddingVertical: 8 },
  news2Card: { marginBottom: 16, borderWidth: 2 },
  news2Score: { fontSize: 48, fontWeight: 'bold', textAlign: 'center' },
  news2Label: { fontSize: 18, textAlign: 'center', marginTop: 4, color: '#374151' },
  news2Action: { fontSize: 14, textAlign: 'center', marginTop: 8, color: '#6B7280' },
  saveButton: { marginBottom: 32, paddingVertical: 8 },
});
