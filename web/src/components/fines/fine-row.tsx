type FineRowProps = {
  playerName: string;
  reason: string;
  amount: number;
  issuedAt: string;
  paid: boolean;
  onTogglePaid: () => void;
  onDelete: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function FineRow({
  playerName,
  reason,
  amount,
  issuedAt,
  paid,
  onTogglePaid,
  onDelete,
}: FineRowProps) {
  return (
    <section className="card stack">
      <div className="split-row">
        <div className="stack-sm">
          <h3>{playerName}</h3>
          <p className="muted">{reason}</p>
          <p className="muted">
            ${amount} • {formatDate(issuedAt)}
          </p>
        </div>
        <span className={paid ? 'metric metric--positive' : 'metric metric--negative'}>
          {paid ? 'Paid' : 'Outstanding'}
        </span>
      </div>

      <div className="inline-actions">
        <button
          className={paid ? 'button button--secondary' : 'button'}
          onClick={onTogglePaid}
          type="button">
          {paid ? 'Mark unpaid' : 'Mark paid'}
        </button>
        <button className="button button--danger" onClick={onDelete} type="button">
          Delete fine
        </button>
      </div>
    </section>
  );
}
