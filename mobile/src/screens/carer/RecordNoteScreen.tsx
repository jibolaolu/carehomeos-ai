import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Animated } from 'react-native';
import {
  Button,
  Text,
  useTheme,
  Chip,
  IconButton,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  startVoiceNote,
  stopVoiceNote,
  playVoiceNote,
  deleteLocalVoiceNote,
  uploadVoiceNote,
  requestAudioPermissions,
  type RecordingState,
} from '../../services/audio';
import { enqueueOfflineJob } from '../../services/offline';
import { saveCareNote } from '../../services/db';
import { useNavigation, useRoute } from '@react-navigation/native';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'cy', label: 'Cymraeg' },
  { code: 'pl', label: 'Polski' },
  { code: 'ro', label: 'Română' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'pt', label: 'Português' },
];

const NOTE_TYPES = ['general', 'medication', 'behaviour', 'nutrition', 'mobility', 'personalCare'];

export default function RecordNoteScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const residentId = route.params?.residentId;

  const [state, setState] = useState<RecordingState>('idle');
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [selectedLang, setSelectedLang] = useState('en');
  const [noteType, setNoteType] = useState('general');
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<any>(null);

  useEffect(() => {
    let pulse: Animated.CompositeAnimation | null = null;
    if (state === 'recording') {
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (pulse) pulse.stop();
    };
  }, [state, pulseAnim]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync?.();
      }
    };
  }, []);

  async function handleToggleRecording() {
    setError(null);
    if (state !== 'recording') {
      const granted = await requestAudioPermissions();
      if (!granted) {
        setError(t('errors.audioPermission'));
        return;
      }
      try {
        await startVoiceNote();
        setState('recording');
      } catch {
        setError(t('errors.recordingError'));
      }
      return;
    }

    try {
      const result = await stopVoiceNote();
      setLocalUri(result.localUri);
      setDuration(result.durationSeconds);
      setState('reviewing');
    } catch {
      setError(t('errors.recordingError'));
      setState('idle');
    }
  }

  async function handlePlay() {
    if (!localUri) return;
    try {
      const sound = await playVoiceNote(localUri);
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch {
      setError(t('errors.generic'));
    }
  }

  function handlePause() {
    if (soundRef.current) {
      soundRef.current.pauseAsync?.();
      setIsPlaying(false);
    }
  }

  async function handleReRecord() {
    if (localUri) {
      await deleteLocalVoiceNote(localUri);
    }
    setLocalUri(null);
    setDuration(0);
    setState('idle');
    setError(null);
  }

  async function handleSubmit() {
    if (!localUri) return;
    setUploading(true);
    setState('uploading');

    const noteId = `note-${Date.now()}`;
    try {
      const uploadRes = await uploadVoiceNote(localUri, {
        residentId: residentId ?? 'unknown',
        noteType,
        detectedLanguage: selectedLang,
        duration,
      });

      if (!uploadRes.deletedAfterTranscription) {
        await enqueueOfflineJob({
          kind: 'care-note',
          payload: JSON.stringify({
            id: noteId,
            residentId: residentId ?? 'unknown',
            localUri,
            s3Key: uploadRes.s3Key,
            noteType,
            detectedLanguage: selectedLang,
            duration,
            recordedAt: new Date().toISOString(),
          }),
        });
      }

      await saveCareNote({
        id: noteId,
        resident_id: residentId ?? 'unknown',
        content: `Voice note (${duration}s)`,
        note_type: noteType,
        recorded_at: new Date().toISOString(),
        sync_status: uploadRes.deletedAfterTranscription ? 'synced' : 'pending',
        sync_error: null,
      });

      setUploading(false);
      navigation.goBack();
    } catch {
      setUploading(false);
      setState('reviewing');
      setError(t('errors.uploadError'));
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          {t('recordNote.title')}
        </Text>

        <SegmentedButtons
          value={noteType}
          onValueChange={setNoteType}
          buttons={NOTE_TYPES.map((type) => ({
            value: type,
            label: t(`recordNote.noteTypes.${type}`),
          }))}
          style={styles.segmented}
        />

        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {t('recordNote.languageLabel')}
        </Text>
        <View style={styles.languageRow}>
          {LANGUAGES.map((lang) => (
            <Chip
              key={lang.code}
              selected={selectedLang === lang.code}
              onPress={() => setSelectedLang(lang.code)}
              style={styles.chip}
              accessibilityLabel={lang.label}
              accessibilityState={{ selected: selectedLang === lang.code }}
            >
              {lang.label}
            </Chip>
          ))}
        </View>

        <View style={styles.recorderContainer}>
          {state === 'recording' && (
            <Animated.View
              style={[
                styles.pulse,
                {
                  backgroundColor: theme.colors.error,
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.6, 0] }),
                },
              ]}
            />
          )}
          <IconButton
            icon={state === 'recording' ? 'stop' : 'microphone'}
            size={64}
            mode="contained"
            containerColor={
              state === 'recording' ? theme.colors.error : theme.colors.primaryContainer
            }
            iconColor={state === 'recording' ? theme.colors.onError : theme.colors.onPrimaryContainer}
            onPress={handleToggleRecording}
            style={styles.recordButton}
            accessibilityLabel={
              state === 'recording' ? t('recordNote.tapToStop') : t('recordNote.tapToStart')
            }
          />
          <Text style={[styles.recordHint, { color: theme.colors.onSurfaceVariant }]}>
            {state === 'recording'
              ? t('recordNote.recording')
              : state === 'reviewing'
              ? t('recordNote.reviewTitle')
              : t('recordNote.tapToStart')}
          </Text>
          {duration > 0 && (
            <Text style={[styles.duration, { color: theme.colors.onSurfaceVariant }]}>
              {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
            </Text>
          )}
        </View>

        {state === 'reviewing' && localUri && (
          <View style={styles.reviewControls}>
            <Button
              mode="outlined"
              icon={isPlaying ? 'pause' : 'play'}
              onPress={isPlaying ? handlePause : handlePlay}
              style={styles.reviewButton}
              accessibilityLabel={isPlaying ? t('recordNote.pause') : t('recordNote.play')}
            >
              {isPlaying ? t('recordNote.pause') : t('recordNote.play')}
            </Button>
            <Button
              mode="outlined"
              icon="microphone"
              onPress={handleReRecord}
              style={styles.reviewButton}
              accessibilityLabel={t('recordNote.reRecord')}
            >
              {t('recordNote.reRecord')}
            </Button>
          </View>
        )}

        {error && (
          <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
        )}

        {uploading && <ActivityIndicator style={styles.loader} />}

        {state === 'reviewing' && (
          <Button
            mode="contained"
            icon="send"
            onPress={handleSubmit}
            disabled={uploading}
            style={styles.submitButton}
            accessibilityLabel={t('recordNote.submitNote')}
          >
            {t('recordNote.submitNote')}
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  segmented: { marginTop: 4 },
  languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  recorderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    height: 180,
  },
  pulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordHint: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  duration: { marginTop: 4, fontSize: 16, fontWeight: '700' },
  reviewControls: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  reviewButton: {
    flex: 1,
  },
  error: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 12,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
});
