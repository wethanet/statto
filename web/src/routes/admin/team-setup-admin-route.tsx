import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { parsePlayersCsv } from '@/lib/team-csv';
import { addPlayer, normalizePlayerSquad } from '@/lib/team';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import { useClubData } from '@web/lib/club-data-context';

export function TeamSetupAdminRoute() {
  const { isHydrated, players, setPlayers } = useClubData();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [playerFormMessage, setPlayerFormMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [squad, setSquad] = useState('');
  const [pastedCsv, setPastedCsv] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    try {
      const csvContent = await selectedFile.text();
      const importedPlayers = parsePlayersCsv(csvContent);

      setPlayers(importedPlayers);
      setImportMessage(`Imported ${importedPlayers.length} players from ${selectedFile.name}.`);
      setPlayerFormMessage(null);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setImportMessage(error.message);
      } else {
        setImportMessage('Could not import that CSV file.');
      }
    } finally {
      event.target.value = '';
    }
  }

  function handleAddPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedNumberInput = number.trim();
    const normalizedNumber = normalizedNumberInput ? Number(normalizedNumberInput) : null;
    const normalizedSquad = normalizePlayerSquad(squad);

    if (!normalizedName) {
      setPlayerFormMessage('Enter a player name.');
      return;
    }

    if (
      normalizedNumberInput &&
      (!Number.isInteger(normalizedNumber) || normalizedNumber == null || normalizedNumber <= 0)
    ) {
      setPlayerFormMessage('Enter a valid guernsey number greater than zero.');
      return;
    }

    const duplicateNumber =
      normalizedNumber != null &&
      players.some((player) => {
        return player.number === normalizedNumber;
      });

    if (duplicateNumber) {
      setPlayerFormMessage(`Player number ${normalizedNumber} is already in use.`);
      return;
    }

    setPlayers((current) => {
      return addPlayer(current, {
        name: normalizedName,
        number: normalizedNumber,
        squad: normalizedSquad,
      });
    });
    setName('');
    setNumber('');
    setSquad('');
    setPlayerFormMessage(`${normalizedName} was added to the roster.`);
  }

  function handleBulkCreatePlayers() {
    const normalizedCsv = pastedCsv.trim();

    if (!normalizedCsv) {
      setImportMessage('Paste CSV content before creating players.');
      return;
    }

    try {
      const importedPlayers = parsePlayersCsv(normalizedCsv);
      const seenNumbers = new Set<number>();

      for (const player of importedPlayers) {
        if (player.number == null) {
          continue;
        }

        if (seenNumbers.has(player.number)) {
          setImportMessage(`Pasted CSV includes duplicate player number ${player.number}.`);
          return;
        }

        seenNumbers.add(player.number);

        const existingPlayer = players.find((candidate) => candidate.number === player.number);

        if (existingPlayer) {
          setImportMessage(`Player number ${player.number} is already in use.`);
          return;
        }
      }

      const createdAt = Date.now();
      const playersToAdd = importedPlayers.map((player, index) => {
        return {
          ...player,
          id: `${player.id}-${createdAt}-${index}`,
        };
      });

      setPlayers((current) => [...current, ...playersToAdd]);
      setPastedCsv('');
      setPlayerFormMessage(null);
      setImportMessage(`Added ${playersToAdd.length} players from pasted CSV.`);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setImportMessage(error.message);
      } else {
        setImportMessage('Could not create players from the pasted CSV.');
      }
    }
  }

  return (
    <AdminPageShell
      description="Add players one at a time or import the roster in bulk, then move into team management for detailed edits."
      title="Player setup">
      <section className="card stack">
        <div className="inline-actions">
          <span className="muted">
            {isHydrated ? 'Player setup changes save immediately.' : 'Loading saved roster...'}
          </span>
          <Link className="text-link" to="/admin/team">
            Back to team management
          </Link>
        </div>
      </section>

      <form className="card stack" onSubmit={handleAddPlayer}>
        <h3>Add player manually</h3>
        <p className="muted">Enter a player directly if you do not want to upload a full CSV.</p>
        <label className="field">
          <span>Player name</span>
          <input
            className="input"
            onChange={(event) => {
              setName(event.target.value);
              setPlayerFormMessage(null);
            }}
            placeholder="Player name"
            value={name}
          />
        </label>
        <div className="two-column">
          <label className="field">
            <span>Guernsey number</span>
            <input
              className="input"
              inputMode="numeric"
              onChange={(event) => {
                setNumber(event.target.value);
                setPlayerFormMessage(null);
              }}
              placeholder="Optional"
              value={number}
            />
          </label>
          <label className="field">
            <span>Squad</span>
            <select
              className="input"
              onChange={(event) => {
                setSquad(event.target.value);
                setPlayerFormMessage(null);
              }}
              value={squad}>
              <option value="">Unassigned</option>
              <option value="cup">Cup</option>
              <option value="plate">Plate</option>
            </select>
          </label>
        </div>
        <div className="inline-actions">
          <button className="button" type="submit">
            Add player
          </button>
          {playerFormMessage ? <p className="muted">{playerFormMessage}</p> : null}
        </div>
      </form>

      <section className="card stack">
        <h3>CSV upload</h3>
        <p className="muted">
          Upload or paste CSV with a `name` column. Optional columns: `number`, `squad`
          or `designation`, `role`, `active`, `primary_position`, `secondary_position`, `running_profile`.
        </p>
        <p className="muted">File imports replace the current roster in the browser app.</p>

        <input
          accept=".csv,text/csv"
          className="hidden-input"
          onChange={handleImportFile}
          ref={fileInputRef}
          type="file"
        />
        <div className="inline-actions">
          <button
            className="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            type="button">
            Upload player CSV
          </button>
        </div>

        <label className="field">
          <span>Pasted CSV</span>
          <textarea
            className="input textarea"
            onChange={(event) => {
              setPastedCsv(event.target.value);
              setImportMessage(null);
            }}
            placeholder={'name,number,squad\nJane Smith,12,cup\nAlex Green,,plate'}
            value={pastedCsv}
          />
        </label>

        <div className="inline-actions">
          <button className="button button--secondary" onClick={handleBulkCreatePlayers} type="button">
            Create players from pasted CSV
          </button>
          {importMessage ? <p className="muted">{importMessage}</p> : null}
        </div>
      </section>
    </AdminPageShell>
  );
}
