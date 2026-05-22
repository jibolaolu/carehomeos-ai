import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export type SyncStatus = 'pending' | 'synced' | 'error';

export interface Resident {
  id: string;
  name: string;
  room: string;
  status: string;
  sync_status: SyncStatus;
  last_synced: string | null;
}

export interface CareNote {
  id: string;
  resident_id: string;
  content: string;
  note_type: string;
  recorded_at: string;
  sync_status: SyncStatus;
  sync_error: string | null;
}

export interface MarSchedule {
  id: string;
  resident_id: string;
  medication_name: string;
  scheduled_time: string;
  status: string;
}

export interface OfflineJob {
  id: string;
  kind: string;
  payload: string;
  created_at: string;
  retry_count: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

export interface SyncState {
  key: string;
  value: string;
  updated_at: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  room TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced TEXT
);

CREATE TABLE IF NOT EXISTS care_notes (
  id TEXT PRIMARY KEY NOT NULL,
  resident_id TEXT NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  recorded_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT
);

CREATE TABLE IF NOT EXISTS mar_schedule (
  id TEXT PRIMARY KEY NOT NULL,
  resident_id TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS offline_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_care_notes_resident ON care_notes(resident_id);
CREATE INDEX IF NOT EXISTS idx_care_notes_sync ON care_notes(sync_status);
CREATE INDEX IF NOT EXISTS idx_offline_jobs_status ON offline_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mar_resident ON mar_schedule(resident_id);
`;

export async function initDatabase(): Promise<void> {
  if (db) return;
  db = await SQLite.openDatabaseAsync('carehomeos.db');
  await db.execAsync(SCHEMA);
}

export async function getResidents(): Promise<Resident[]> {
  if (!db) throw new Error('Database not initialized');
  return db.getAllAsync<Resident>('SELECT * FROM residents ORDER BY name');
}

export async function saveResident(resident: Resident): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    `INSERT INTO residents (id, name, room, status, sync_status, last_synced)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       room=excluded.room,
       status=excluded.status,
       sync_status=excluded.sync_status,
       last_synced=excluded.last_synced`,
    resident.id,
    resident.name,
    resident.room,
    resident.status,
    resident.sync_status,
    resident.last_synced
  );
}

export async function getCareNotes(residentId?: string): Promise<CareNote[]> {
  if (!db) throw new Error('Database not initialized');
  if (residentId) {
    return db.getAllAsync<CareNote>(
      'SELECT * FROM care_notes WHERE resident_id = ? ORDER BY recorded_at DESC',
      residentId
    );
  }
  return db.getAllAsync<CareNote>('SELECT * FROM care_notes ORDER BY recorded_at DESC');
}

export async function saveCareNote(note: CareNote): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    `INSERT INTO care_notes (id, resident_id, content, note_type, recorded_at, sync_status, sync_error)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       resident_id=excluded.resident_id,
       content=excluded.content,
       note_type=excluded.note_type,
       recorded_at=excluded.recorded_at,
       sync_status=excluded.sync_status,
       sync_error=excluded.sync_error`,
    note.id,
    note.resident_id,
    note.content,
    note.note_type,
    note.recorded_at,
    note.sync_status,
    note.sync_error
  );
}

export async function getOfflineJobs(status?: OfflineJob['status']): Promise<OfflineJob[]> {
  if (!db) throw new Error('Database not initialized');
  if (status) {
    return db.getAllAsync<OfflineJob>(
      'SELECT * FROM offline_jobs WHERE status = ? ORDER BY created_at ASC',
      status
    );
  }
  return db.getAllAsync<OfflineJob>('SELECT * FROM offline_jobs ORDER BY created_at ASC');
}

export async function saveOfflineJob(job: OfflineJob): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    `INSERT INTO offline_jobs (id, kind, payload, created_at, retry_count, status)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       kind=excluded.kind,
       payload=excluded.payload,
       created_at=excluded.created_at,
       retry_count=excluded.retry_count,
       status=excluded.status`,
    job.id,
    job.kind,
    job.payload,
    job.created_at,
    job.retry_count,
    job.status
  );
}

export async function deleteOfflineJob(id: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync('DELETE FROM offline_jobs WHERE id = ?', id);
}

export async function updateSyncState(key: string, value: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    `INSERT INTO sync_state (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value=excluded.value,
       updated_at=excluded.updated_at`,
    key,
    value,
    new Date().toISOString()
  );
}

export async function getSyncState(key: string): Promise<string | null> {
  if (!db) throw new Error('Database not initialized');
  const row = await db.getFirstAsync<SyncState>('SELECT * FROM sync_state WHERE key = ?', key);
  return row?.value ?? null;
}

export async function getPendingJobsCount(): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM offline_jobs WHERE status IN ('pending', 'failed')"
  );
  return row?.count ?? 0;
}

export async function getMarSchedule(residentId?: string): Promise<MarSchedule[]> {
  if (!db) throw new Error('Database not initialized');
  if (residentId) {
    return db.getAllAsync<MarSchedule>(
      'SELECT * FROM mar_schedule WHERE resident_id = ? ORDER BY scheduled_time ASC',
      residentId
    );
  }
  return db.getAllAsync<MarSchedule>('SELECT * FROM mar_schedule ORDER BY scheduled_time ASC');
}

export async function saveMarSchedule(item: MarSchedule): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    `INSERT INTO mar_schedule (id, resident_id, medication_name, scheduled_time, status)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       resident_id=excluded.resident_id,
       medication_name=excluded.medication_name,
       scheduled_time=excluded.scheduled_time,
       status=excluded.status`,
    item.id,
    item.resident_id,
    item.medication_name,
    item.scheduled_time,
    item.status
  );
}
