import { useMemo, useState } from 'react';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import {
  AdminActionPanel,
  AdminRecordList,
  AdminSection,
  AdminSummaryStrip,
} from '@web/components/admin/admin-workflow';
import { FineRow } from '@web/components/fines/fine-row';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { useClubPermissions } from '@web/lib/club-permissions';

import {
  addFine,
  deleteFine,
  getFinePlayerName,
  getFineSummary,
  getSortedFines,
  toggleFinePaidStatus,
} from '@/lib/fines';
import { getPlayerDisplayName, getPlayerSortValue } from '@/lib/team';

export function FinesAdminRoute() {
  useEnsureClubCollections(['fines', 'players']);

  const { fines, isHydrated, players, setFines } = useClubData();
  const { canManagePlayer } = useClubPermissions();
  const manageablePlayers = useMemo(() => {
    return players.filter((player) => canManagePlayer(player));
  }, [canManagePlayer, players]);
  const manageablePlayerIds = useMemo(() => {
    return new Set(manageablePlayers.map((player) => player.id));
  }, [manageablePlayers]);
  const visibleFines = useMemo(() => {
    return fines.filter((fine) => manageablePlayerIds.has(fine.playerId));
  }, [fines, manageablePlayerIds]);
  const activePlayers = useMemo(() => {
    return [...manageablePlayers]
      .filter((player) => player.active)
      .sort((left, right) => getPlayerSortValue(left.number) - getPlayerSortValue(right.number));
  }, [manageablePlayers]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const summary = getFineSummary(visibleFines);
  const sortedFines = getSortedFines(visibleFines);
  const filteredPlayers = useMemo(() => {
    const normalizedQuery = playerQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return activePlayers.filter((player) => {
      const searchableText = getPlayerDisplayName(player).toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [activePlayers, playerQuery]);
  const selectedPlayer = activePlayers.find((player) => player.id === selectedPlayerId);

  function selectPlayer(playerId: string) {
    const player = activePlayers.find((candidate) => candidate.id === playerId);

    if (!player) {
      return;
    }

    setSelectedPlayerId(player.id);
    setPlayerQuery(getPlayerDisplayName(player));
    setFormMessage(null);
  }

  function clearSelectedPlayer() {
    setSelectedPlayerId('');
    setPlayerQuery('');
  }

  function handleAddFine() {
    const normalizedReason = reason.trim();
    const normalizedAmount = Number(amount);

    if (!selectedPlayerId) {
      setFormMessage('Choose a player before adding a fine.');
      return;
    }

    if (!normalizedReason) {
      setFormMessage('Enter a reason for the fine.');
      return;
    }

    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      setFormMessage('Enter a valid fine amount greater than zero.');
      return;
    }

    setFines((current) =>
      addFine(current, {
        playerId: selectedPlayerId,
        reason: normalizedReason,
        amount: normalizedAmount,
      })
    );
    setReason('');
    setAmount('');
    setFormMessage('Fine added.');
  }

  return (
    <AdminPageShell
      description="Track fines, what they were for, and whether the cash has actually been collected."
      title="Player fines">
      <AdminSection
        eyebrow="Context"
        title="Collection status"
        description={isHydrated ? `${summary.outstandingCount} fines still need collecting.` : 'Loading saved fines...'}>
        <AdminSummaryStrip
          items={[
            { label: 'Total fines', value: `$${summary.totalAmount}`, note: `${sortedFines.length} records` },
            {
              label: 'Outstanding',
              value: `$${summary.outstandingAmount}`,
              note: `${summary.outstandingCount} unpaid`,
              tone: 'negative',
            },
            { label: 'Paid', value: `$${summary.paidAmount}`, note: 'collected', tone: 'positive' },
          ]}
        />
      </AdminSection>

      <AdminSection
        eyebrow="Primary workflow"
        title="Record a fine"
        description="Select the player first so the saved record is unambiguous, then enter the reason and amount.">
        <AdminActionPanel title="Fine entry" description="Search active players you are allowed to manage.">
          <label className="field">
            <span>Player search</span>
            <input
              className="input"
              onChange={(event) => {
                setPlayerQuery(event.target.value);
                setSelectedPlayerId('');
                setFormMessage(null);
              }}
              placeholder="Search player by name or number"
              value={playerQuery}
            />
          </label>

          {selectedPlayer ? (
            <button className="button button--warning" onClick={clearSelectedPlayer} type="button">
              Clear selection
            </button>
          ) : null}

          <div className="inline-actions">
            {filteredPlayers.map((player) => {
              const isSelected = player.id === selectedPlayerId;

              return (
                <button
                  key={player.id}
                  className={isSelected ? 'pill-button pill-button--selected' : 'pill-button'}
                  onClick={() => selectPlayer(player.id)}
                  type="button">
                  {getPlayerDisplayName(player)}
                </button>
              );
            })}
          </div>

          <p className="muted">
            {selectedPlayer
              ? `Selected: ${getPlayerDisplayName(selectedPlayer)}`
              : 'Type a player name or number, then choose a matching player.'}
          </p>

          <div className="two-column">
            <label className="field">
              <span>Reason</span>
              <input
                className="input"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason"
                value={reason}
              />
            </label>
            <label className="field">
              <span>Amount</span>
              <input
                className="input"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Amount"
                value={amount}
              />
            </label>
          </div>

          <div className="inline-actions">
            <button className="button" onClick={handleAddFine} type="button">
              Save fine
            </button>
            {formMessage ? <p className="muted">{formMessage}</p> : null}
          </div>
        </AdminActionPanel>
      </AdminSection>

      <AdminSection
        eyebrow="Records"
        title="Saved fines"
        description="Mark fines paid as cash is collected, or remove mistakes from the record.">
        <AdminRecordList title="Fine records" description="Newest and outstanding records stay visible for follow-up.">
          {sortedFines.length > 0 ? (
            sortedFines.map((fine) => {
              return (
                <FineRow
                  key={fine.id}
                  amount={fine.amount}
                  issuedAt={fine.issuedAt}
                  onDelete={() => {
                    setFines((current) => deleteFine(current, fine.id));
                  }}
                  onTogglePaid={() => {
                    setFines((current) => toggleFinePaidStatus(current, fine.id));
                  }}
                  paid={fine.paid}
                  playerName={getFinePlayerName(fine.playerId, manageablePlayers)}
                  reason={fine.reason}
                />
              );
            })
          ) : (
            <p className="muted">No fines recorded yet.</p>
          )}
        </AdminRecordList>
      </AdminSection>
    </AdminPageShell>
  );
}
