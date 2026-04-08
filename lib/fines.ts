import type { Fine, Player } from '@/lib/types';

type FineSummary = {
  totalAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  outstandingCount: number;
};

export function getSortedFines(fines: Fine[]) {
  return [...fines].sort((left, right) => {
    return new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime();
  });
}

export function getFineSummary(fines: Fine[]): FineSummary {
  return fines.reduce<FineSummary>(
    (summary, fine) => {
      summary.totalAmount += fine.amount;

      if (fine.paid) {
        summary.paidAmount += fine.amount;
      } else {
        summary.outstandingAmount += fine.amount;
        summary.outstandingCount += 1;
      }

      return summary;
    },
    { totalAmount: 0, outstandingAmount: 0, paidAmount: 0, outstandingCount: 0 }
  );
}

export function getFinePlayerName(playerId: string, players: Player[]) {
  return players.find((player) => {
    return player.id === playerId;
  })?.name ?? 'Unknown player';
}

export function toggleFinePaidStatus(fines: Fine[], fineId: string) {
  return fines.map((fine) => {
    if (fine.id !== fineId) {
      return fine;
    }

    return {
      ...fine,
      paid: !fine.paid,
    };
  });
}

export function deleteFine(fines: Fine[], fineId: string) {
  return fines.filter((fine) => {
    return fine.id !== fineId;
  });
}

export function deleteFinesForPlayer(fines: Fine[], playerId: string) {
  return fines.filter((fine) => {
    return fine.playerId !== playerId;
  });
}

export function addFine(
  fines: Fine[],
  input: {
    playerId: string;
    reason: string;
    amount: number;
  }
) {
  const fine: Fine = {
    id: `fine-${Date.now()}`,
    playerId: input.playerId,
    reason: input.reason.trim(),
    amount: input.amount,
    issuedAt: new Date().toISOString(),
    paid: false,
  };

  return [fine, ...fines];
}
