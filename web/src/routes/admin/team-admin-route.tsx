import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';

import { deleteAttendanceRecordsForPlayer } from '@/lib/attendance';
import { deleteAvailabilityRecordsForPlayer } from '@/lib/availability';
import { deleteFinesForPlayer } from '@/lib/fines';
import { deleteFitnessResultsForPlayer } from '@/lib/fitness';
import { parsePlayersCsv } from '@/lib/team-csv';
import {
  addPlayer,
  cyclePlayerRole,
  deletePlayer,
  getSortedTeam,
  getTeamSummary,
  togglePlayerActive,
  updatePlayerDetails,
} from '@/lib/team';
import { deleteVoteEntriesForPlayer } from '@/lib/votes';

import { TeamPlayerRow } from '@web/components/team/team-player-row';
import { useClubData } from '@web/lib/club-data-context';

export function TeamAdminRoute() {
  const {
    isHydrated,
    players,
    setAttendanceRecords,
    setAvailabilityRecords,
    setFitnessResults,
    setFines,
    setPlayers,
    setVoteEntries,
  } = useClubData();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [playerFormMessage, setPlayerFormMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState('');
  const [pastedCsv, setPastedCsv] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const summary = getTeamSummary(players);
  const roster = getSortedTeam(players);

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
    const normalizedPosition = position.trim() || null;

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
        position: normalizedPosition,
      });
    });
    setName('');
    setNumber('');
    setPosition('');
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

  function handleDeletePlayer(playerId: string, playerName: string) {
    setPlayers((current) => {
      return deletePlayer(current, playerId);
    });
    setAttendanceRecords((current) => {
      return deleteAttendanceRecordsForPlayer(current, playerId);
    });
    setAvailabilityRecords((current) => {
      return deleteAvailabilityRecordsForPlayer(current, playerId);
    });
    setFitnessResults((current) => {
      return deleteFitnessResultsForPlayer(current, playerId);
    });
    setFines((current) => {
      return deleteFinesForPlayer(current, playerId);
    });
    setVoteEntries((current) => {
      return deleteVoteEntriesForPlayer(current, playerId);
    });
    setImportMessage(`${playerName} was removed from the roster.`);
  }

  function handleSavePlayerDetails(
    playerId: string,
    playerName: string,
    input: { number: string; position: string }
  ) {
    const normalizedNumberInput = input.number.trim();
    const normalizedNumber = normalizedNumberInput ? Number(normalizedNumberInput) : null;
    const normalizedPosition = input.position.trim() || null;

    if (
      normalizedNumberInput &&
      (!Number.isInteger(normalizedNumber) || normalizedNumber == null || normalizedNumber <= 0)
    ) {
      return 'Enter a valid guernsey number greater than zero.';
    }

    const duplicateNumber =
      normalizedNumber != null &&
      players.some((player) => {
        return player.id !== playerId && player.number === normalizedNumber;
      });

    if (duplicateNumber) {
      return `Player number ${normalizedNumber} is already in use.`;
    }

    setPlayers((current) => {
      return updatePlayerDetails(current, playerId, {
        number: normalizedNumber,
        position: normalizedPosition,
      });
    });
    setImportMessage(`${playerName} details updated.`);

    return null;
  }

  return (
    <section className="page-grid">
      <section className="panel stack">
        <span className="eyebrow">Admin</span>
        <h2>Team management</h2>
        <p className="muted">
          Keep the playing list current, adjust leadership roles, and mark who is in the active squad.
        </p>
      </section>

      <section className="card stack">
        <h3>Roster summary</h3>
        <div className="metric-row">
          <span className="metric metric--neutral">{summary.total} total</span>
          <span className="metric metric--positive">{summary.active} active</span>
          <span className="metric metric--negative">{summary.inactive} inactive</span>
          <span className="metric metric--neutral">{summary.leaders} leaders</span>
        </div>
        <p className="muted">
          {isHydrated ? 'Roster changes are saved in the browser app.' : 'Loading saved roster...'}
        </p>
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
            <span>Position</span>
            <input
              className="input"
              onChange={(event) => {
                setPosition(event.target.value);
                setPlayerFormMessage(null);
              }}
              placeholder="Optional"
              value={position}
            />
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
          Upload or paste CSV with a `name` column. Optional columns: `number`, `position`, `role`,
          `active`.
        </p>
        <p className="muted">Importing replaces the current roster in the browser app.</p>

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
            placeholder={'name,number,position\nJane Smith,12,Rover\nAlex Green,,Wing'}
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

      {roster.map((player) => {
        return (
          <TeamPlayerRow
            key={player.id}
            onCycleRole={() => {
              setPlayers((current) => cyclePlayerRole(current, player.id));
            }}
            onDelete={() => {
              handleDeletePlayer(player.id, player.name);
            }}
            onSaveDetails={(input) => {
              return handleSavePlayerDetails(player.id, player.name, input);
            }}
            onToggleActive={() => {
              setPlayers((current) => togglePlayerActive(current, player.id));
            }}
            player={player}
          />
        );
      })}
    </section>
  );
}
