export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase();
}

export function createClubId() {
  return `club-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
