import { saveOfflineJob, getOfflineJobs, deleteOfflineJob, getPendingJobsCount, type OfflineJob } from './db';

export type { OfflineJob };

export async function enqueueOfflineJob(
  job: Omit<OfflineJob, 'id' | 'created_at' | 'retry_count' | 'status'>
): Promise<OfflineJob> {
  const queued: OfflineJob = {
    ...job,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: 'pending',
  };
  await saveOfflineJob(queued);
  return queued;
}

export async function getOfflineQueue(): Promise<OfflineJob[]> {
  const pending = await getOfflineJobs('pending');
  const failed = await getOfflineJobs('failed');
  return [...pending, ...failed];
}

export async function markOfflineJobSynced(id: string): Promise<void> {
  await deleteOfflineJob(id);
}

export async function getPendingJobsCount(): Promise<number> {
  return getPendingJobsCount();
}
