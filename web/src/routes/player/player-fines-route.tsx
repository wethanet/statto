import { getFineSummary, getFinesForPlayer, getSortedFines, toggleFinePaidStatus } from '@/lib/fines';

import { PlayerPageShell } from '@web/components/player/player-page-shell';
import { useClubData } from '@web/lib/club-data-context';
import { usePlayerProfile } from '@web/lib/player-profile-context';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function PlayerFinesRoute() {
  const { fines, isHydrated, setFines } = useClubData();
  const { selectedPlayer } = usePlayerProfile();
  const playerFines = selectedPlayer ? getFinesForPlayer(fines, selectedPlayer.id) : [];
  const sortedFines = getSortedFines(playerFines);
  const summary = getFineSummary(playerFines);

  return (
    <PlayerPageShell
      description="See what is outstanding, what has been paid, and mark fines once they are sorted."
      title="Your fines">
      {selectedPlayer ? (
        <>
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
