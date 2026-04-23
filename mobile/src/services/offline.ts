export type OfflineJob = {
  id: string;
  kind: "care-note" | "mar-record" | "handover";
  payload: Record<string, unknown>;
  createdAt: string;
};

const queue: OfflineJob[] = [];

export function enqueueOfflineJob(job: Omit<OfflineJob, "id" | "createdAt">): OfflineJob {
  const queued = {
    ...job,
    id: `offline-${queue.length + 1}`,
    createdAt: new Date().toISOString(),
  };
  queue.push(queued);
  return queued;
}

export function getOfflineQueue(): OfflineJob[] {
  return [...queue];
}

export function markOfflineJobSynced(id: string): void {
  const index = queue.findIndex((job) => job.id === id);
  if (index >= 0) {
    queue.splice(index, 1);
  }
}
