import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { api } from './api';
import { enqueueOfflineJob } from './offline';
import NetInfo from '@react-native-netinfo/netinfo';

export type RecordingState = 'idle' | 'recording' | 'reviewing' | 'uploading';

let currentRecording: Audio.Recording | null = null;

const RECORDINGS_DIR = FileSystem.documentDirectory + 'recordings/';

async function ensureRecordingsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
}

export async function requestAudioPermissions(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

export async function startVoiceNote(): Promise<{
  state: RecordingState;
  startedAt: string;
}> {
  await ensureRecordingsDir();
  const hasPermission = await requestAudioPermissions();
  if (!hasPermission) {
    throw new Error('Microphone permission not granted');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  currentRecording = recording;

  return { state: 'recording', startedAt: new Date().toISOString() };
}

export async function stopVoiceNote(): Promise<{
  state: RecordingState;
  localUri: string;
  durationSeconds: number;
}> {
  if (!currentRecording) {
    throw new Error('No active recording');
  }

  await currentRecording.stopAndUnloadAsync();
  const uri = currentRecording.getURI();
  const status = await currentRecording.getStatusAsync();
  const durationMillis =
    status && 'durationMillis' in status ? (status.durationMillis as number) : 0;
  currentRecording = null;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  if (!uri) {
    throw new Error('Recording URI is null');
  }

  const fileName = `voice-note-${Date.now()}.m4a`;
  const localUri = RECORDINGS_DIR + fileName;
  await FileSystem.moveAsync({ from: uri, to: localUri });

  return {
    state: 'reviewing',
    localUri,
    durationSeconds: Math.round(durationMillis / 1000),
  };
}

export async function uploadVoiceNote(
  localUri: string,
  metadata?: Record<string, unknown>
): Promise<{ s3Key: string; deletedAfterTranscription: boolean }> {
  const net = await NetInfo.fetch();
  const fileName = localUri.split('/').pop() ?? 'care-note.m4a';
  const s3Key = `audio-temp/${fileName}`;

  if (!net.isConnected) {
    await enqueueOfflineJob({
      kind: 'care-note',
      payload: JSON.stringify({
        s3Key,
        localUri,
        ...metadata,
      }),
    });
    return { s3Key, deletedAfterTranscription: false };
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await api.transcribeNote({ s3_key: s3Key, simulated_transcript: 'Voice note uploaded' });

    await deleteLocalVoiceNote(localUri);
    return { s3Key, deletedAfterTranscription: true };
  } catch (err) {
    await enqueueOfflineJob({
      kind: 'care-note',
      payload: JSON.stringify({
        s3Key,
        localUri,
        ...metadata,
      }),
    });
    return { s3Key, deletedAfterTranscription: false };
  }
}

export async function playVoiceNote(localUri: string): Promise<Audio.Sound> {
  const { sound } = await Audio.Sound.createAsync({ uri: localUri }, { shouldPlay: true });
  return sound;
}

export async function deleteLocalVoiceNote(localUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      await FileSystem.deleteAsync(localUri);
    }
  } catch {
    // ignore cleanup errors
  }
}
