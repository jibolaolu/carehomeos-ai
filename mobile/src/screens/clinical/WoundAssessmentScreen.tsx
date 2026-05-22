import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Image } from 'react-native';
import {
  Text,
  useTheme,
  TextInput,
  Button,
  SegmentedButtons,
  Chip,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { saveCareNote, enqueueOfflineJob } from '../../services/offline';
import { saveCareNote as dbSaveCareNote } from '../../services/db';
import NetInfo from '@react-native-netinfo/netinfo';

const WOUND_TYPES = ['pressure', 'diabetic', 'surgical', 'traumatic', 'venous', 'arterial'];
const EXUDATE_LEVELS = ['none', 'low', 'moderate', 'heavy'];
const SKIN_CONDITIONS = ['healthy', 'macerated', 'erythema', 'oedema', 'excoriated'];

export default function WoundAssessmentScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();

  const [location, setLocation] = useState('');
  const [sizeLength, setSizeLength] = useState('');
  const [sizeWidth, setSizeWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [woundType, setWoundType] = useState('pressure');
  const [exudate, setExudate] = useState('low');
  const [skin, setSkin] = useState('healthy');
  const [painScore, setPainScore] = useState('0');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTakePhoto() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError(t('errors.cameraPermission'));
        return;
      }
    }
    setShowCamera(true);
  }

  async function handleCapture() {
    // In a real implementation, use cameraRef.current.takePictureAsync()
    // For now, simulate with a placeholder flow
    setPhotoUri('file://wound-photo.jpg');
    setShowCamera(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const net = await NetInfo.fetch();
    const noteId = `wound-${Date.now()}`;
    const payload = {
      id: noteId,
      location,
      size: `${sizeLength}x${sizeWidth}`,
      depth,
      woundType,
      exudate,
      skin,
      painScore: parseInt(painScore, 10),
      photoUri,
      recordedAt: new Date().toISOString(),
    };

    try {
      await dbSaveCareNote({
        id: noteId,
        resident_id: 'unknown',
        content: `Wound assessment: ${location}, ${woundType}, pain ${painScore}/10`,
        note_type: 'wound',
        recorded_at: payload.recordedAt,
        sync_status: net.isConnected ? 'synced' : 'pending',
        sync_error: null,
      });

      if (!net.isConnected) {
        await enqueueOfflineJob({
          kind: 'wound-assessment',
          payload: JSON.stringify(payload),
        });
      }

      setSaving(false);
      navigation.goBack();
    } catch {
      setSaving(false);
      setError(t('errors.generic'));
    }
  }

  if (showCamera) {
    return (
      <SafeAreaView style={styles.screen}>
        <CameraView style={styles.camera} facing="back">
          <View style={styles.cameraControls}>
            <Button mode="contained" onPress={handleCapture} accessibilityLabel={t('clinical.takePhoto')}>
              {t('clinical.takePhoto')}
            </Button>
            <Button mode="text" onPress={() => setShowCamera(false)} accessibilityLabel={t('common.cancel')}>
              {t('common.cancel')}
            </Button>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          {t('clinical.woundAssessmentTitle')}
        </Text>

        <TextInput
          label={t('clinical.woundLocation')}
          value={location}
          onChangeText={setLocation}
          mode="outlined"
          accessibilityLabel={t('clinical.woundLocation')}
        />

        <View style={styles.row}>
          <TextInput
            label={`${t('clinical.woundSize')} L (cm)`}
            value={sizeLength}
            onChangeText={setSizeLength}
            mode="outlined"
            keyboardType="numeric"
            style={styles.halfInput}
            accessibilityLabel="Wound length"
          />
          <TextInput
            label={`${t('clinical.woundSize')} W (cm)`}
            value={sizeWidth}
            onChangeText={setSizeWidth}
            mode="outlined"
            keyboardType="numeric"
            style={styles.halfInput}
            accessibilityLabel="Wound width"
          />
        </View>

        <TextInput
          label={t('clinical.woundDepth')}
          value={depth}
          onChangeText={setDepth}
          mode="outlined"
          keyboardType="numeric"
          accessibilityLabel={t('clinical.woundDepth')}
        />

        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {t('clinical.woundType')}
        </Text>
        <View style={styles.chipRow}>
          {WOUND_TYPES.map((type) => (
            <Chip
              key={type}
              selected={woundType === type}
              onPress={() => setWoundType(type)}
              style={styles.chip}
              accessibilityLabel={type}
            >
              {type}
            </Chip>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {t('clinical.exudate')}
        </Text>
        <SegmentedButtons
          value={exudate}
          onValueChange={setExudate}
          buttons={EXUDATE_LEVELS.map((level) => ({ value: level, label: level }))}
        />

        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {t('clinical.surroundingSkin')}
        </Text>
        <View style={styles.chipRow}>
          {SKIN_CONDITIONS.map((cond) => (
            <Chip
              key={cond}
              selected={skin === cond}
              onPress={() => setSkin(cond)}
              style={styles.chip}
              accessibilityLabel={cond}
            >
              {cond}
            </Chip>
          ))}
        </View>

        <TextInput
          label={t('clinical.painScore')}
          value={painScore}
          onChangeText={(text) => {
            const val = Math.min(10, Math.max(0, parseInt(text || '0', 10)));
            setPainScore(String(val));
          }}
          mode="outlined"
          keyboardType="numeric"
          accessibilityLabel={t('clinical.painScore')}
        />
        <HelperText type="info">0 = no pain, 10 = worst pain</HelperText>

        {photoUri ? (
          <View>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <Button mode="outlined" onPress={handleTakePhoto} icon="camera" accessibilityLabel={t('clinical.retakePhoto')}>
              {t('clinical.retakePhoto')}
            </Button>
          </View>
        ) : (
          <Button mode="outlined" onPress={handleTakePhoto} icon="camera" accessibilityLabel={t('clinical.takePhoto')}>
            {t('clinical.takePhoto')}
          </Button>
        )}

        {error && <HelperText type="error">{error}</HelperText>}
        {saving && <ActivityIndicator style={styles.loader} />}

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={saving || !location}
          icon="content-save"
          accessibilityLabel={t('common.save')}
        >
          {t('common.save')}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  photo: { width: '100%', height: 200, borderRadius: 8, marginBottom: 8 },
  camera: { flex: 1 },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },
  loader: { marginVertical: 12 },
});
