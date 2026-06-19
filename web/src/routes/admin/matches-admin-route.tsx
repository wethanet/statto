import { type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  addFixture,
  deleteFixture,
  getSortedFixtures,
  updateFixture,
} from '@/lib/availability';
import { deleteMatchLineupAssignmentsForFixture } from '@/lib/match-lineup';
import { deleteMatchStatsForFixture } from '@/lib/match-stats';
import { getPlayerSquadLabel, normalizePlayerSquad } from '@/lib/team';
import type { PlayerSquad } from '@/lib/types';
import { deletePlayerVoteBallotsForFixture, deleteVoteEntriesForFixture } from '@/lib/votes';

import { AdminPageShell } from '@web/components/admin/admin-page-shell';
import {
  AdminActionPanel,
  AdminRecordList,
  AdminSection,
  AdminSupportingPanel,
} from '@web/components/admin/admin-workflow';
import { importFixturesFromCalendarUrl, normalizeWebcalUrl } from '@web/lib/fixture-calendar';
import { useClubData, useEnsureClubCollections } from '@web/lib/club-data-context';

type FixtureFormResult =
  | {
      error: string;
    }
  | {
      input: {
        opponent: string;
        grade: string | null;
        squad: PlayerSquad | null;
        date: string;
        venue: string;
        isHome: boolean;
      };
    };

type EventListFilter = 'upcoming' | 'all';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function MatchesAdminRoute() {
  useEnsureClubCollections([
    'fixtures',
    'matchLineupAssignments',
    'matchStats',
    'playerVoteBallots',
    'voteEntries',
  ]);

  const { fixtures, setFixtures, setMatchLineupAssignments, setMatchStats, setPlayerVoteBallots, setVoteEntries } =
    useClubData();
  const [opponent, setOpponent] = useState('');
  const [grade, setGrade] = useState('');
  const [squad, setSquad] = useState('');
  const [fixtureDate, setFixtureDate] = useState('');
  const [fixtureTime, setFixtureTime] = useState('');
  const [venue, setVenue] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [isImportingCalendar, setIsImportingCalendar] = useState(false);
  const [eventListFilter, setEventListFilter] = useState<EventListFilter>('upcoming');
  const sortedFixtures = useMemo(() => {
    return getSortedFixtures(fixtures);
  }, [fixtures]);
  const filteredFixtures = useMemo(() => {
    if (eventListFilter === 'all') {
      return sortedFixtures;
    }

    return sortedFixtures.filter((fixture) => {
      return new Date(fixture.date).getTime() >= Date.now();
    });
  }, [eventListFilter, sortedFixtures]);

  function resetFixtureForm() {
    setOpponent('');
    setGrade('');
    setSquad('');
    setFixtureDate('');
    setFixtureTime('');
    setVenue('');
    setIsHome(true);
    setEditingFixtureId(null);
  }

  function getFixtureInputFromForm(): FixtureFormResult {
    const normalizedOpponent = opponent.trim();
    const normalizedGrade = grade.trim() || null;
    const normalizedSquad = normalizePlayerSquad(squad);
    const normalizedDate = fixtureDate.trim();
    const normalizedTime = fixtureTime.trim();
    const normalizedVenue = venue.trim();

    if (!normalizedOpponent) {
      return { error: 'Enter the opposition club.' };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return { error: 'Enter the date as YYYY-MM-DD.' };
    }

    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
      return { error: 'Enter the start time as HH:MM.' };
    }

    if (!normalizedVenue) {
      return { error: 'Enter a venue.' };
    }

    const fixtureTimestamp = `${normalizedDate}T${normalizedTime}:00`;

    if (Number.isNaN(new Date(fixtureTimestamp).getTime())) {
      return { error: 'Enter a valid date and time.' };
    }

    return {
      input: {
        opponent: normalizedOpponent,
        grade: normalizedGrade,
        squad: normalizedSquad,
        date: fixtureTimestamp,
        venue: normalizedVenue,
        isHome,
      },
    };
  }

  function handleSaveFixture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = getFixtureInputFromForm();

    if ('error' in result) {
      setFormMessage(result.error);
      return;
    }

    setFixtures((current) => {
      if (editingFixtureId) {
        return updateFixture(current, editingFixtureId, result.input);
      }

      return addFixture(current, result.input);
    });

    const wasEditing = Boolean(editingFixtureId);
    resetFixtureForm();
    setFormMessage(wasEditing ? 'Match updated.' : 'Match added.');
  }

  function handleEditFixture(fixtureId: string) {
    const fixture = fixtures.find((currentFixture) => currentFixture.id === fixtureId);

    if (!fixture) {
      setFormMessage('Match not found.');
      return;
    }

    const [datePart, timePartWithSeconds = '00:00:00'] = fixture.date.split('T');
    const timePart = timePartWithSeconds.slice(0, 5);

    setEditingFixtureId(fixture.id);
    setOpponent(fixture.opponent);
    setGrade(fixture.grade ?? '');
    setSquad(fixture.squad ?? '');
    setFixtureDate(datePart ?? '');
    setFixtureTime(timePart);
    setVenue(fixture.venue);
    setIsHome(fixture.isHome);
    setFormMessage(`Editing ${fixture.opponent}.`);
  }

  async function handleImportCalendar() {
    const normalizedUrl = normalizeWebcalUrl(calendarUrl);

    if (!normalizedUrl) {
      setCalendarMessage('Enter a webcal link before importing.');
      return;
    }

    setIsImportingCalendar(true);
    setCalendarMessage(null);

    try {
      const result = await importFixturesFromCalendarUrl(normalizedUrl, fixtures);

      setFixtures(result.fixtures);
      setCalendarUrl('');

      if (result.importedCount === 0) {
        setCalendarMessage(`No new matches were imported. ${result.skippedCount} duplicates were skipped.`);
        return;
      }

      if (result.skippedCount > 0) {
        setCalendarMessage(
          `Imported ${result.importedCount} matches. ${result.skippedCount} duplicates were skipped.`
        );
        return;
      }

      setCalendarMessage(`Imported ${result.importedCount} matches from the calendar feed.`);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setCalendarMessage(error.message);
      } else {
        setCalendarMessage('Could not import matches from that calendar feed.');
      }
    } finally {
      setIsImportingCalendar(false);
    }
  }

  function handleDeleteFixture(fixtureId: string) {
    setFixtures((current) => {
      return deleteFixture(current, fixtureId);
    });
    setMatchLineupAssignments((current) => {
      return deleteMatchLineupAssignmentsForFixture(current, fixtureId);
    });
    setVoteEntries((current) => {
      return deleteVoteEntriesForFixture(current, fixtureId);
    });
    setPlayerVoteBallots((current) => {
      return deletePlayerVoteBallotsForFixture(current, fixtureId);
    });
    setMatchStats((current) => {
      return deleteMatchStatsForFixture(current, fixtureId);
    });
    setFormMessage('Match deleted.');
  }

  return (
    <AdminPageShell
      actions={
        <Link className="text-link" to="/matches">
          Open match availability
        </Link>
      }
      description="Create fixtures for the season, then manage availability from the matches tab."
      title="Match setup">
      <AdminSection
        eyebrow="Primary workflow"
        title={editingFixtureId ? 'Edit fixture details' : 'Add the next fixture'}
        description="Create or correct the match record before availability, selection, and stats depend on it.">
        <form onSubmit={handleSaveFixture}>
          <AdminActionPanel
            title={editingFixtureId ? 'Update fixture' : 'Add fixture'}
            description={
              editingFixtureId
                ? 'Update the imported or saved match details, then save the correction.'
                : 'Set the opposition, date, time, venue, squad visibility, and home or away status.'
            }>

        <label className="field">
          <span>Opponent</span>
          <input
            className="input"
            onChange={(event) => {
              setOpponent(event.target.value);
              setFormMessage(null);
            }}
            placeholder="Opponent"
            value={opponent}
          />
        </label>

        <label className="field">
          <span>Grade</span>
          <input
            className="input"
            onChange={(event) => {
              setGrade(event.target.value);
              setFormMessage(null);
            }}
            placeholder="Grade (optional)"
            value={grade}
          />
        </label>

        <label className="field">
          <span>Squad access</span>
          <select
            className="input"
            onChange={(event) => {
              setSquad(event.target.value);
              setFormMessage(null);
            }}
            value={squad}>
            <option value="">All squads</option>
            <option value="cup">{getPlayerSquadLabel('cup')}</option>
            <option value="plate">{getPlayerSquadLabel('plate')}</option>
          </select>
        </label>

        <div className="two-column">
          <label className="field">
            <span>Date</span>
            <input
              className="input"
              onChange={(event) => {
                setFixtureDate(event.target.value);
                setFormMessage(null);
              }}
              placeholder="YYYY-MM-DD"
              value={fixtureDate}
            />
          </label>

          <label className="field">
            <span>Start time</span>
            <input
              className="input"
              onChange={(event) => {
                setFixtureTime(event.target.value);
                setFormMessage(null);
              }}
              placeholder="HH:MM"
              value={fixtureTime}
            />
          </label>
        </div>

        <label className="field">
          <span>Venue</span>
          <input
            className="input"
            onChange={(event) => {
              setVenue(event.target.value);
              setFormMessage(null);
            }}
            placeholder="Venue"
            value={venue}
          />
        </label>

        <div className="inline-actions">
          <button
            className={isHome ? 'pill-button pill-button--selected' : 'pill-button'}
            onClick={() => {
              setIsHome(true);
              setFormMessage(null);
            }}
            type="button">
            Home
          </button>
          <button
            className={!isHome ? 'pill-button pill-button--selected' : 'pill-button'}
            onClick={() => {
              setIsHome(false);
              setFormMessage(null);
            }}
            type="button">
            Away
          </button>
        </div>

        <div className="inline-actions">
          <button className="button" type="submit">
            {editingFixtureId ? 'Update match' : 'Save match'}
          </button>
          {editingFixtureId ? (
            <button
              className="button button--ghost"
              onClick={() => {
                resetFixtureForm();
                setFormMessage('Edit cancelled.');
              }}
              type="button">
              Cancel edit
            </button>
          ) : null}
        </div>

        {formMessage ? <p className="muted">{formMessage}</p> : null}
          </AdminActionPanel>
        </form>
      </AdminSection>

      <AdminSection
        eyebrow="Supporting tool"
        title="Bulk import fixtures"
        description="Use calendar import when the league fixture feed is available. Review the fixture list afterward.">
        <AdminSupportingPanel
          title="Import from webcal"
          description="Paste a `webcal://` or `https://` calendar feed and import fixtures from event summaries, start times, and locations.">
        <label className="field">
          <span>Calendar feed URL</span>
          <input
            className="input"
            onChange={(event) => {
              setCalendarUrl(event.target.value);
              setCalendarMessage(null);
            }}
            placeholder="webcal://example.com/fixtures.ics"
            value={calendarUrl}
          />
        </label>
        <div className="inline-actions">
          <button className="button" disabled={isImportingCalendar} onClick={handleImportCalendar} type="button">
            {isImportingCalendar ? 'Importing...' : 'Import calendar'}
          </button>
          {calendarMessage ? <p className="muted">{calendarMessage}</p> : null}
        </div>
        </AdminSupportingPanel>
      </AdminSection>

      <AdminSection
        eyebrow="Records"
        title="Fixture list"
        description="Upcoming fixtures are shown by default so past rounds stay out of the way.">
        <AdminRecordList
          title="Fixtures"
          description="Edit upcoming fixture details or delete records that should no longer drive availability and stats."
          actions={
            <>
            <button
              className={eventListFilter === 'upcoming' ? 'pill-button pill-button--selected' : 'pill-button'}
              onClick={() => setEventListFilter('upcoming')}
              type="button">
              Upcoming
            </button>
            <button
              className={eventListFilter === 'all' ? 'pill-button pill-button--selected' : 'pill-button'}
              onClick={() => setEventListFilter('all')}
              type="button">
              All
            </button>
            </>
          }>
        {filteredFixtures.length > 0 ? (
          filteredFixtures.map((fixture) => {
            return (
              <div key={fixture.id} className="row-card">
                <div className="stack-sm">
                  <strong>{fixture.grade ? `${fixture.grade} • ` : ''}vs {fixture.opponent}</strong>
                  <span className="muted">
                    {fixture.isHome ? 'Home' : 'Away'} • {formatDate(fixture.date)}
                  </span>
                  <span className="muted">{fixture.venue}</span>
                </div>
                <div className="inline-actions">
                  <button
                    className="button button--secondary"
                    onClick={() => {
                      handleEditFixture(fixture.id);
                    }}
                    type="button">
                    Edit
                  </button>
                  <button
                    className="button button--danger"
                    onClick={() => {
                      handleDeleteFixture(fixture.id);
                    }}
                    type="button">
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="muted">{eventListFilter === 'upcoming' ? 'No upcoming fixtures.' : 'No fixtures yet.'}</p>
        )}
        </AdminRecordList>
      </AdminSection>
    </AdminPageShell>
  );
}
