import { normalizeClubDataSnapshot, type ClubDataSnapshot } from '@/lib/club-data-snapshot';
import { supabase } from '@/lib/supabase';

const CLUB_DATA_TABLE = 'club_data_snapshots';

export async function loadCloudClubDataSnapshot(userId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(CLUB_DATA_TABLE)
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.payload) {
    return null;
  }

  return normalizeClubDataSnapshot(data.payload as Partial<ClubDataSnapshot>);
}

export async function saveCloudClubDataSnapshot(userId: string, snapshot: ClubDataSnapshot) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from(CLUB_DATA_TABLE).upsert({
    user_id: userId,
    payload: snapshot,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}
