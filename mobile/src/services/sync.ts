import NetInfo, { type NetInfoState } from '@react-native-netinfo/netinfo';
import {
  getOfflineJobs,
  saveOfflineJob,
  deleteOfflineJob,
  updateSyncState,
  getSyncState,
  saveCareNote,
  saveMarSchedule,
  type OfflineJob,
} from './db';
import { api } from './api';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;
let lastNetworkState: boolean | null = null;
let netInfoUnsubscribe: (() => void) | null = null;

const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 30000;

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
}

function getBackoffMs(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 30000);
}

async function processJob(job: OfflineJob): Promise<boolean> {
  const payload = JSON.parse(job.payload);

  try {
    switch (job.kind) {
      case 'care-note': {
        const transcriptRes = await api.transcribeNote({
          s3_key: payload.s3Key,
          simulated_transcript: payload.simulatedTranscript,
          detected_language: payload.detectedLanguage,
        });
        const generateRes = await api.generateNote({
          resident_id: payload.residentId,
          transcript: transcriptRes.transcript ?? transcriptRes.simulated_transcript ?? '',
          note_type: payload.noteType ?? 'general',
          original_language: payload.detectedLanguage,
          original_transcript: payload.simulatedTranscript,
        });
        await saveCareNote({
          id: generateRes.note_id ?? payload.id,
          resident_id: payload.residentId,
          content: generateRes.note ?? payload.content ?? '',
          note_type: payload.noteType ?? 'general',
          recorded_at: payload.recordedAt ?? new Date().toISOString(),
          sync_status: 'synced',
          sync_error: null,
        });
        break;
      }
      case 'mar-record': {
        await api.transcribeNote({ simulated_transcript: 'MAR update' });
        await saveMarSchedule({
          id: payload.id ?? job.id,
          resident_id: payload.residentId,
          medication_name: payload.medicationName,
          scheduled_time: payload.scheduledTime,
          status: payload.status ?? 'administered',
        });
        break;
      }
      case 'vital-signs':
      case 'fluid-balance':
      case 'wound-assessment': {
        await api.transcribeNote({ simulated_transcript: `${job.kind} recorded` });
        break;
      }
      default:
        return false;
    }
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (job.retry_count >= MAX_RETRIES) {
      await saveOfflineJob({ ...job, status: 'failed', retry_count: job.retry_count });
      return false;
    }
    await saveOfflineJob({
      ...job,
      retry_count: job.retry_count + 1,
      status: 'failed',
    });
    return false;
  }
}

async function runSync(): Promise<void> {
  if (isProcessing) return;
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  isProcessing = true;
  try {
    const jobs = await getOfflineJobs('pending');
    for (const job of jobs) {
      await saveOfflineJob({ ...job, status: 'processing' });
      const success = await processJob(job);
      if (success) {
        await deleteOfflineJob(job.id);
      }
    }
    const failedJobs = await getOfflineJobs('failed');
    for (const job of failedJobs) {
      const backoff = getBackoffMs(job.retry_count);
      const failedAt = new Date(job.created_at).getTime();
      if (Date.now() - failedAt < backoff) continue;
      await saveOfflineJob({ ...job, status: 'pending' });
    }
    await updateSyncState('last_sync_at', new Date().toISOString());
  } finally {
    isProcessing = false;
  }
}

export function startSyncEngine(): void {
  if (syncInterval) return;

  netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = state.isConnected ?? false;
    if (lastNetworkState === false && isOnline) {
      runSync();
    }
    lastNetworkState = isOnline;
  });

  syncInterval = setInterval(runSync, SYNC_INTERVAL_MS);
  runSync();
}

export function stopSyncEngine(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
}

export async function forceSync(): Promise<void> {
  await runSync();
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const net = await NetInfo.fetch();
  const pending = await getOfflineJobs('pending');
  const failed = await getOfflineJobs('failed');
  const lastSync = await getSyncState('last_sync_at');
  return {
    isOnline: net.isConnected ?? false,
    isSyncing: isProcessing,
    pendingCount: pending.length + failed.length,
    lastSyncAt: lastSync,
  };
}
