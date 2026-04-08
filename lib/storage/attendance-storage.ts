import { attendanceRecords } from '@/lib/mock-data';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';
import type { AttendanceRecord } from '@/lib/types';

const ATTENDANCE_STORAGE_KEY = 'attendance-records.json';

export async function loadAttendanceRecords() {
  const storedRecords = await readJsonStorage<AttendanceRecord[]>(ATTENDANCE_STORAGE_KEY);

  return storedRecords ?? attendanceRecords;
}

export async function saveAttendanceRecords(records: AttendanceRecord[]) {
  await writeJsonStorage(ATTENDANCE_STORAGE_KEY, records);
}
