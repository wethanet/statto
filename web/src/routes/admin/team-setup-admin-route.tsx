import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { parsePlayersCsv } from '@/lib/team-csv';
import { addPlayer, normalizePlayerSquad } from '@/lib/team';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import {
  AdminActionPanel,
  AdminHelpText,
  AdminSection,
  AdminSummaryStrip,
  AdminSupportingPanel,
} from '@web/components/admin/admin-workflow';
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
      <AdminSection
        eyebrow="Context"
        title="Roster intake"
        description="Use this page to get players into the system, then manage detailed roles and attributes from team management."
        actions={
          <Link className="text-link" to="/admin/team">
            Back to team management
          </Link>
        }>
        <AdminSummaryStrip
          items={[
            {
              label: 'Current roster',
              value: String(players.length),
              note: isHydrated ? 'saved players' : 'loading roster',
            },
            {
              label: 'Save status',
              value: isHydrated ? 'Ready' : 'Loading',
              note: isHydrated ? 'changes save immediately' : 'waiting for saved data',
            },
          ]}
        />
      </AdminSection>

      <AdminSection
        eyebrow="Primary workflow"
        title="Add one player"
        description="Use the manual workflow for late additions, corrections, or players who should not come from a CSV import.">
        <form onSubmit={handleAddPlayer}>
          <AdminActionPanel
            title="Manual player entry"
            description="Enter the player name first, then add an optional guernsey number and squad.">
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
          </AdminActionPanel>
        </form>
      </AdminSection>

      <AdminSection
        eyebrow="Supporting tool"
        title="Bulk import roster"
        description="Use CSV import when the list is ready in a spreadsheet. File imports replace the roster; pasted CSV appends new players.">
        <AdminSupportingPanel
          title="CSV upload and paste"
          description="CSV needs a name column. Optional columns include number, squad/designation, role, active, positions, and running profile.">
          <AdminHelpText>
            Review the roster after import from team management so leadership roles, player links, and rotation attributes are correct.
          </AdminHelpText>
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
        </AdminSupportingPanel>
      </AdminSection>
    </AdminPageShell>
  );
}
