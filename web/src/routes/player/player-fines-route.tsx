import { useMemo, useState } from 'react';

import { addFine, getFineSummary, getFinesForPlayer, getSortedFines, toggleFinePaidStatus } from '@/lib/fines';
import { getPlayerDisplayName, getPlayerSortValue } from '@/lib/team';

import { PlayerPageShell } from '@web/components/player/player-page-shell';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';
import { usePlayerProfile } from '@web/lib/player-profile-context';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function PlayerFinesRoute() {
  useEnsureClubCollections(['fines', 'players']);

  const { fines, isHydrated, players, setFines } = useClubData();
  const { selectedPlayer } = usePlayerProfile();
  const activePlayers = useMemo(() => {
    return [...players]
      .filter((player) => player.active)
      .sort((left, right) => getPlayerSortValue(left.number) - getPlayerSortValue(right.number));
  }, [players]);
  const playerFines = selectedPlayer ? getFinesForPlayer(fines, selectedPlayer.id) : [];
  const sortedFines = getSortedFines(playerFines);
  const summary = getFineSummary(playerFines);
  const [selectedFinePlayerId, setSelectedFinePlayerId] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const selectedFinePlayer = activePlayers.find((player) => player.id === selectedFinePlayerId) ?? null;
  const filteredPlayers = useMemo(() => {
    const normalizedQuery = playerQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return activePlayers.filter((player) => {
      return getPlayerDisplayName(player).toLowerCase().includes(normalizedQuery);
    });
  }, [activePlayers, playerQuery]);

  function selectPlayer(playerId: string) {
    const player = activePlayers.find((candidate) => candidate.id === playerId);

    if (!player) {
      return;
    }

    setSelectedFinePlayerId(player.id);
    setPlayerQuery(getPlayerDisplayName(player));
    setFormMessage(null);
  }

  function clearSelectedPlayer() {
    setSelectedFinePlayerId('');
    setPlayerQuery('');
  }

  function handleAddFine() {
    const normalizedReason = reason.trim();
    const normalizedAmount = Number(amount);

    if (!selectedFinePlayerId) {
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

    setFines((current) => {
      return addFine(current, {
        playerId: selectedFinePlayerId,
        reason: normalizedReason,
        amount: normalizedAmount,
      });
    });
    setReason('');
    setAmount('');
    setFormMessage('Fine added.');
  }

  return (
    <PlayerPageShell
      description="See what is outstanding, what has been paid, and mark fines once they are sorted."
      title="Your fines">
      {selectedPlayer ? (
        <>
          <section className="card stack">
            <h3>Add a fine</h3>
            <p className="muted">Search any player in the club, then record the reason and amount.</p>

            <label className="field">
              <span>Player search</span>
              <input
                className="input"
                onChange={(event) => {
                  setPlayerQuery(event.target.value);
                  setSelectedFinePlayerId('');
                  setFormMessage(null);
                }}
                placeholder="Search player by name or number"
                value={playerQuery}
              />
            </label>

            {selectedFinePlayer ? (
              <button className="button button--warning" onClick={clearSelectedPlayer} type="button">
                Clear selection
              </button>
            ) : null}

            <div className="inline-actions">
              {filteredPlayers.map((player) => {
                const isSelected = player.id === selectedFinePlayerId;

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
              {selectedFinePlayer
                ? `Selected: ${getPlayerDisplayName(selectedFinePlayer)}`
                : 'Type a player name or number, then choose a match.'}
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
          </section>

          <section className="admin-summary-grid">
            <section className="card stack-sm">
              <span className="eyebrow">Outstanding</span>
              <strong className="admin-summary-grid__value">${summary.outstandingAmount}</strong>
              <span className="muted">{summary.outstandingCount} unpaid fines</span>
            </section>

            <section className="card stack-sm">
              <span className="eyebrow">Paid</span>
              <strong className="admin-summary-grid__value">${summary.paidAmount}</strong>
              <span className="muted">Already cleared</span>
            </section>

            <section className="card stack-sm">
              <span className="eyebrow">Total</span>
              <strong className="admin-summary-grid__value">${summary.totalAmount}</strong>
              <span className="muted">{playerFines.length} fines on record</span>
            </section>

            <section className="card stack-sm">
              <span className="eyebrow">Sync</span>
              <strong className="admin-summary-grid__value">{isHydrated ? 'Live' : '...'}</strong>
              <span className="muted">
                {isHydrated ? 'Changes save for the club.' : 'Loading saved fines...'}
              </span>
            </section>
          </section>

          {sortedFines.length > 0 ? (
            sortedFines.map((fine) => (
              <section className="card stack" key={fine.id}>
                <div className="split-row">
                  <div className="stack-sm">
                    <h3>{fine.reason}</h3>
                    <p className="muted">
                      ${fine.amount} • {formatDate(fine.issuedAt)}
                    </p>
                  </div>

                  <span className={fine.paid ? 'metric metric--positive' : 'metric metric--negative'}>
                    {fine.paid ? 'Paid' : 'Outstanding'}
                  </span>
                </div>

                <div className="inline-actions">
                  <button
                    className={fine.paid ? 'button button--secondary' : 'button'}
                    onClick={() => {
                      setFines((current) => toggleFinePaidStatus(current, fine.id));
                    }}
                    type="button">
                    {fine.paid ? 'Mark unpaid' : 'Mark paid'}
                  </button>
                </div>
              </section>
            ))
          ) : (
            <section className="card stack">
              <h3>No fines yet</h3>
              <p className="muted">Nothing has been recorded against this player yet.</p>
            </section>
          )}
        </>
      ) : null}
    </PlayerPageShell>
  );
}
