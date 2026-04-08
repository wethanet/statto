import { availabilityRecords } from '@/lib/mock-data';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage/json-storage';
import type { AvailabilityRecord } from '@/lib/types';

const AVAILABILITY_STORAGE_KEY = 'availability-records.json';

export async function loadAvailabilityRecords() {
  const storedRecords = await readJsonStorage<AvailabilityRecord[]>(AVAILABILITY_STORAGE_KEY);

  return storedRecords ?? availabilityRecords;
}

export async function saveAvailabilityRecords(records: AvailabilityRecord[]) {
  await writeJsonStorage(AVAILABILITY_STORAGE_KEY, records);
}
