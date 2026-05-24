import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Flag,
  Gauge,
  ListChecks,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Shirt,
  Swords,
  TimerReset,
  Trash2,
  Trophy,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import './styles.css';

type Phase = 'Offense' | 'Defense' | 'Special';
type ResultKey = 'run' | 'pass' | 'incomplete' | 'first' | 'td' | 'turnover' | 'sack' | 'tackle' | 'pat' | 'fg';
type PlayerStatus = 'Ready' | 'Rest' | 'Watch';
type MobileTab = 'game' | 'roster' | 'clock';

type Player = {
  id: number;
  number: number;
  name: string;
  role: string;
  status: PlayerStatus;
};

type PlayEntry = {
  id: number;
  phase: Phase;
  result: string;
  yards: number;
  clock: string;
  quarter: number;
  score: string;
  down: number;
  distance: number;
  yardLine: number;
  penalty: number;
  note: string;
};

type GameSnapshot = {
  gameId: string;
  gameName: string;
  homeTeam: string;
  awayTeam: string;
  quarter: number;
  clock: number;
  running: boolean;
  ourScore: number;
  oppScore: number;
  homeTimeouts: number;
  awayTimeouts: number;
  possession: 'home' | 'away';
  down: number;
  distance: number;
  yardLine: number;
  phase: Phase;
  selectedResult: ResultKey;
  selectedPlayers: number[];
  roster: Player[];
  plays: PlayEntry[];
};

type SavedProfile = {
  id: string;
  name: string;
  updatedAt: string;
  state: GameSnapshot;
};

const STORAGE_KEY = 'livesnaps-coach-console-state-v2';
const PROFILES_KEY = 'livesnaps-coach-console-profiles-v1';

const defaultRoster: Player[] = [
  { id: 1, number: 2, name: 'M. Rivera', role: 'QB', status: 'Ready' },
  { id: 2, number: 5, name: 'J. Brooks', role: 'RB', status: 'Ready' },
  { id: 3, number: 9, name: 'A. Carter', role: 'WR', status: 'Ready' },
  { id: 4, number: 11, name: 'N. Stone', role: 'WR', status: 'Rest' },
  { id: 5, number: 18, name: 'T. Lane', role: 'TE', status: 'Ready' },
  { id: 6, number: 22, name: 'K. Miles', role: 'LB', status: 'Ready' },
  { id: 7, number: 31, name: 'D. King', role: 'DB', status: 'Watch' },
  { id: 8, number: 44, name: 'E. Young', role: 'DL', status: 'Ready' },
  { id: 9, number: 51, name: 'P. Woods', role: 'OL', status: 'Ready' },
  { id: 10, number: 67, name: 'S. Reed', role: 'OL', status: 'Ready' },
  { id: 11, number: 72, name: 'G. Cruz', role: 'OL', status: 'Ready' },
];

const initialPlays: PlayEntry[] = [
  {
    id: 101,
    phase: 'Offense',
    result: 'Complete',
    yards: 11,
    clock: '7:58',
    quarter: 2,
    score: '14-8',
    down: 1,
    distance: 10,
    yardLine: 42,
    penalty: 0,
    note: '#2, #9, #18',
  },
  {
    id: 100,
    phase: 'Defense',
    result: 'Tackle',
    yards: 2,
    clock: '8:34',
    quarter: 2,
    score: '14-8',
    down: 3,
    distance: 4,
    yardLine: 39,
    penalty: 0,
    note: '#22 closed inside lane',
  },
];

const defaultState: GameSnapshot = {
  gameId: 'demo-game',
  gameName: 'Week 4 vs Northside',
  homeTeam: 'Central Jr.',
  awayTeam: 'Northside',
  quarter: 2,
  clock: 600,
  running: false,
  ourScore: 14,
  oppScore: 8,
  homeTimeouts: 2,
  awayTimeouts: 3,
  possession: 'home',
  down: 2,
  distance: 6,
  yardLine: 42,
  phase: 'Offense',
  selectedResult: 'run',
  selectedPlayers: [1, 2, 3, 5, 9, 10, 11],
  roster: defaultRoster,
  plays: initialPlays,
};

const phaseMeta: Record<Phase, { icon: React.ReactNode; label: string; className: string }> = {
  Offense: { icon: <Swords size={18} />, label: 'Offense', className: 'phase-offense' },
  Defense: { icon: <Shield size={18} />, label: 'Defense', className: 'phase-defense' },
  Special: { icon: <Zap size={18} />, label: 'Special', className: 'phase-special' },
};

const resultOptions: Record<Phase, Array<{ key: ResultKey; label: string; yards: number; score?: number; clock: number }>> = {
  Offense: [
    { key: 'run', label: 'Run', yards: 4, clock: 7 },
    { key: 'pass', label: 'Complete', yards: 8, clock: 6 },
    { key: 'incomplete', label: 'Incomplete', yards: 0, clock: 0 },
    { key: 'first', label: 'First Down', yards: 12, clock: 6 },
    { key: 'td', label: 'Touchdown', yards: 24, score: 6, clock: 5 },
    { key: 'turnover', label: 'Turnover', yards: 0, clock: 0 },
  ],
  Defense: [
    { key: 'tackle', label: 'Tackle', yards: 3, clock: 6 },
    { key: 'sack', label: 'Sack', yards: -5, clock: 4 },
    { key: 'incomplete', label: 'Pass Breakup', yards: 0, clock: 0 },
    { key: 'turnover', label: 'Takeaway', yards: 0, clock: 0 },
    { key: 'td', label: 'Def TD', yards: 35, score: 6, clock: 0 },
  ],
  Special: [
    { key: 'run', label: 'Kick Return', yards: 18, clock: 5 },
    { key: 'fg', label: 'Field Goal', yards: 0, score: 3, clock: 0 },
    { key: 'pat', label: 'PAT Good', yards: 0, score: 1, clock: 0 },
    { key: 'turnover', label: 'Muffed/Lost', yards: 0, clock: 0 },
  ],
};

const fieldSlots = [
  { role: 'WR', x: 16, y: 28 },
  { role: 'LT', x: 37, y: 48 },
  { role: 'LG', x: 43, y: 48 },
  { role: 'C', x: 49, y: 48 },
  { role: 'RG', x: 55, y: 48 },
  { role: 'RT', x: 61, y: 48 },
  { role: 'TE', x: 70, y: 42 },
  { role: 'QB', x: 49, y: 62 },
  { role: 'RB', x: 49, y: 77 },
  { role: 'WR', x: 84, y: 28 },
  { role: 'WR', x: 78, y: 69 },
];

const formatClock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const hydrateState = (partial: Partial<GameSnapshot>): GameSnapshot => ({
  ...defaultState,
  ...partial,
  roster: partial.roster?.length ? partial.roster : defaultRoster,
  plays: partial.plays ?? initialPlays,
  selectedPlayers: partial.selectedPlayers ?? defaultState.selectedPlayers,
});

const loadSavedState = (): GameSnapshot => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? hydrateState(JSON.parse(raw)) : defaultState;
  } catch {
    return defaultState;
  }
};

const loadProfiles = (): SavedProfile[] => {
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const sanitizeFilename = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'livesnaps';

const downloadText = (filename: string, content: string, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const parseRosterCsv = (raw: string): Player[] => {
  const rows = raw.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  const body = rows[0]?.toLowerCase().includes('number') ? rows.slice(1) : rows;
  return body.map((row, index) => {
    const [numberText, name = `Player ${index + 1}`, role = 'ATH', status = 'Ready'] = row.split(',').map((cell) => cell.trim());
    const normalizedStatus = status === 'Rest' || status === 'Watch' ? status : 'Ready';
    return {
      id: Date.now() + index,
      number: Number(numberText) || index + 1,
      name,
      role,
      status: normalizedStatus as PlayerStatus,
    };
  });
};

function App() {
  const initialState = useMemo(() => loadSavedState(), []);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    return requestedTab === 'roster' || requestedTab === 'clock' ? requestedTab : 'game';
  });
  const [isResultSheetOpen, setIsResultSheetOpen] = useState(() => new URLSearchParams(window.location.search).get('sheet') === '1');
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [gameId, setGameId] = useState(initialState.gameId);
  const [gameName, setGameName] = useState(initialState.gameName);
  const [homeTeam, setHomeTeam] = useState(initialState.homeTeam);
  const [awayTeam, setAwayTeam] = useState(initialState.awayTeam);
  const [quarter, setQuarter] = useState(initialState.quarter);
  const [clock, setClock] = useState(initialState.clock);
  const [running, setRunning] = useState(initialState.running);
  const [ourScore, setOurScore] = useState(initialState.ourScore);
  const [oppScore, setOppScore] = useState(initialState.oppScore);
  const [homeTimeouts, setHomeTimeouts] = useState(initialState.homeTimeouts);
  const [awayTimeouts, setAwayTimeouts] = useState(initialState.awayTimeouts);
  const [possession, setPossession] = useState(initialState.possession);
  const [down, setDown] = useState(initialState.down);
  const [distance, setDistance] = useState(initialState.distance);
  const [yardLine, setYardLine] = useState(initialState.yardLine);
  const [phase, setPhase] = useState<Phase>(initialState.phase);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>(initialState.selectedPlayers);
  const [selectedResult, setSelectedResult] = useState<ResultKey>(initialState.selectedResult);
  const [roster, setRoster] = useState<Player[]>(initialState.roster);
  const [plays, setPlays] = useState<PlayEntry[]>(initialState.plays);
  const [yardOverride, setYardOverride] = useState<number | null>(null);
  const [penaltyYards, setPenaltyYards] = useState(0);
  const [rosterImport, setRosterImport] = useState('number,name,role,status\n2,M. Rivera,QB,Ready\n5,J. Brooks,RB,Ready');
  const [profiles, setProfiles] = useState<SavedProfile[]>(() => loadProfiles());
  const [undoStack, setUndoStack] = useState<GameSnapshot[]>([]);

  const currentResult = resultOptions[phase].find((item) => item.key === selectedResult) ?? resultOptions[phase][0];
  const currentYards = yardOverride ?? currentResult.yards;
  const netYards = currentYards + penaltyYards;
  const readyCount = roster.filter((player) => player.status === 'Ready').length;
  const selectedRoster = useMemo(() => roster.filter((player) => selectedPlayers.includes(player.id)), [roster, selectedPlayers]);
  const selectedProfileId = profiles.find((profile) => profile.state.gameId === gameId)?.id ?? '';
  const offenseTotal = plays.filter((play) => play.phase === 'Offense').reduce((total, play) => total + play.yards + play.penalty, 0);
  const defensiveStops = plays.filter((play) => play.phase === 'Defense' && play.result !== 'Def TD').length;

  const captureSnapshot = (): GameSnapshot => ({
    gameId,
    gameName,
    homeTeam,
    awayTeam,
    quarter,
    clock,
    running,
    ourScore,
    oppScore,
    homeTimeouts,
    awayTimeouts,
    possession,
    down,
    distance,
    yardLine,
    phase,
    selectedResult,
    selectedPlayers,
    roster,
    plays,
  });

  const restoreSnapshot = (snapshot: GameSnapshot) => {
    setGameId(snapshot.gameId);
    setGameName(snapshot.gameName);
    setHomeTeam(snapshot.homeTeam);
    setAwayTeam(snapshot.awayTeam);
    setQuarter(snapshot.quarter);
    setClock(snapshot.clock);
    setRunning(snapshot.running);
    setOurScore(snapshot.ourScore);
    setOppScore(snapshot.oppScore);
    setHomeTimeouts(snapshot.homeTimeouts);
    setAwayTimeouts(snapshot.awayTimeouts);
    setPossession(snapshot.possession);
    setDown(snapshot.down);
    setDistance(snapshot.distance);
    setYardLine(snapshot.yardLine);
    setPhase(snapshot.phase);
    setSelectedResult(snapshot.selectedResult);
    setSelectedPlayers(snapshot.selectedPlayers);
    setRoster(snapshot.roster);
    setPlays(snapshot.plays);
    setYardOverride(null);
    setPenaltyYards(0);
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setClock((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (clock === 0 && running) setRunning(false);
  }, [clock, running]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(captureSnapshot()));
  }, [gameId, gameName, homeTeam, awayTeam, quarter, clock, running, ourScore, oppScore, homeTimeouts, awayTimeouts, possession, down, distance, yardLine, phase, selectedResult, selectedPlayers, roster, plays]);

  useEffect(() => {
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const togglePlayer = (id: number) => {
    setSelectedPlayers((current) => (current.includes(id) ? current.filter((playerId) => playerId !== id) : [...current, id]).slice(0, 11));
  };

  const setPhaseAndResult = (item: Phase) => {
    setPhase(item);
    setSelectedResult(resultOptions[item][0].key);
    setYardOverride(null);
    setPenaltyYards(0);
  };

  const saveProfile = () => {
    const state = captureSnapshot();
    const id = selectedProfileId || state.gameId || `game-${Date.now()}`;
    const profile: SavedProfile = { id, name: state.gameName || `${state.homeTeam} vs ${state.awayTeam}`, updatedAt: new Date().toISOString(), state: { ...state, gameId: id } };
    setGameId(id);
    setProfiles((current) => [profile, ...current.filter((item) => item.id !== id)].slice(0, 12));
  };

  const loadProfile = (id: string) => {
    const profile = profiles.find((item) => item.id === id);
    if (profile) restoreSnapshot(hydrateState(profile.state));
  };

  const newGame = () => {
    const next: GameSnapshot = {
      ...defaultState,
      gameId: `game-${Date.now()}`,
      gameName: `New Game ${profiles.length + 1}`,
      homeTeam,
      awayTeam,
      roster,
      selectedPlayers: roster.slice(0, 11).map((player) => player.id),
      plays: [],
      ourScore: 0,
      oppScore: 0,
      quarter: 1,
      clock: 600,
      homeTimeouts: 3,
      awayTimeouts: 3,
      down: 1,
      distance: 10,
      yardLine: 25,
      phase: 'Offense',
      selectedResult: 'run',
    };
    restoreSnapshot(next);
  };

  const deleteProfile = () => {
    if (!selectedProfileId) return;
    setProfiles((current) => current.filter((profile) => profile.id !== selectedProfileId));
  };

  const updateDownDistance = (yards: number, result: ResultKey) => {
    if (result === 'td') {
      setDown(1);
      setDistance(10);
      setYardLine(25);
      setPossession('away');
      return;
    }

    if (result === 'turnover' || down === 4 || phase === 'Special') {
      setDown(1);
      setDistance(10);
      setYardLine(25);
      setPossession((value) => (value === 'home' ? 'away' : 'home'));
      setPhase(result === 'turnover' && phase !== 'Defense' ? 'Defense' : 'Offense');
      return;
    }

    const nextYardLine = Math.min(99, Math.max(1, yardLine + yards));
    setYardLine(nextYardLine);
    if (result === 'first' || yards >= distance) {
      setDown(1);
      setDistance(10);
    } else {
      setDown((value) => Math.min(4, value + 1));
      setDistance((value) => Math.max(1, value - yards));
    }
  };

  const logPlay = () => {
    setUndoStack((current) => [...current, captureSnapshot()].slice(-8));
    const scoreValue = currentResult.score ?? 0;
    const isOpponentScore = possession === 'away' && scoreValue > 0;
    const nextOurScore = isOpponentScore ? ourScore : ourScore + scoreValue;
    const nextOppScore = isOpponentScore ? oppScore + scoreValue : oppScore;
    const nextClock = Math.max(0, clock - currentResult.clock);
    const playerNote = selectedRoster.slice(0, 4).map((player) => `#${player.number}`).join(', ') || 'No players selected';

    const newPlay: PlayEntry = {
      id: Date.now(),
      phase,
      result: currentResult.label,
      yards: currentYards,
      clock: formatClock(nextClock),
      quarter,
      score: `${nextOurScore}-${nextOppScore}`,
      down,
      distance,
      yardLine,
      penalty: penaltyYards,
      note: penaltyYards ? `${playerNote} | penalty ${penaltyYards > 0 ? '+' : ''}${penaltyYards}` : playerNote,
    };

    setOurScore(nextOurScore);
    setOppScore(nextOppScore);
    setClock(nextClock);
    setPlays((current) => [newPlay, ...current].slice(0, 80));
    updateDownDistance(netYards, currentResult.key);
    setIsResultSheetOpen(false);
    setYardOverride(null);
    setPenaltyYards(0);
  };

  const undoLastPlay = () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    restoreSnapshot(previous);
    setUndoStack((current) => current.slice(0, -1));
  };

  const resetGame = () => {
    setUndoStack((current) => [...current, captureSnapshot()].slice(-8));
    setClock(600);
    setRunning(false);
    setOurScore(0);
    setOppScore(0);
    setHomeTimeouts(3);
    setAwayTimeouts(3);
    setQuarter(1);
    setDown(1);
    setDistance(10);
    setYardLine(25);
    setPossession('home');
    setPhase('Offense');
    setSelectedResult('run');
    setSelectedPlayers(roster.slice(0, 11).map((player) => player.id));
    setYardOverride(null);
    setPenaltyYards(0);
    setPlays([]);
  };

  const importRoster = () => {
    const imported = parseRosterCsv(rosterImport);
    if (!imported.length) return;
    setRoster(imported);
    setSelectedPlayers(imported.slice(0, 11).map((player) => player.id));
  };

  const exportRoster = () => {
    const rows = ['number,name,role,status', ...roster.map((player) => `${player.number},${player.name},${player.role},${player.status}`)];
    downloadText(`${sanitizeFilename(gameName)}-roster.csv`, rows.join('\n'), 'text/csv');
  };

  const exportReport = () => {
    const rows = [
      `Game,${gameName}`,
      `Teams,${homeTeam},${awayTeam}`,
      `Score,${ourScore},${oppScore}`,
      '',
      'quarter,clock,phase,result,yards,penalty,down,distance,yardLine,score,note',
      ...plays.slice().reverse().map((play) => [play.quarter, play.clock, play.phase, play.result, play.yards, play.penalty, play.down, play.distance, play.yardLine, play.score, play.note].join(',')),
    ];
    downloadText(`${sanitizeFilename(gameName)}-play-report.csv`, rows.join('\n'), 'text/csv');
  };

  const timeoutDots = (count: number) => [0, 1, 2].map((item) => <i key={item} className={item >= count ? 'empty' : ''} />);

  const resultControls = (
    <>
      <div className="result-grid">
        {resultOptions[phase].map((option) => (
          <button
            key={option.key}
            className={selectedResult === option.key ? 'active' : ''}
            onClick={() => {
              setSelectedResult(option.key);
              setYardOverride(null);
            }}
          >
            <strong>{option.label}</strong>
            <span>{option.yards > 0 ? `+${option.yards}` : option.yards} yd</span>
          </button>
        ))}
      </div>
      <div className="yard-adjuster">
        <span>Yards</span>
        <div>
          <button onClick={() => setYardOverride(currentYards - 1)}>-</button>
          <strong>{currentYards > 0 ? `+${currentYards}` : currentYards}</strong>
          <button onClick={() => setYardOverride(currentYards + 1)}>+</button>
        </div>
      </div>
      <div className="yard-adjuster">
        <span>Penalty</span>
        <div>
          <button onClick={() => setPenaltyYards((value) => value - 5)}>-</button>
          <strong>{penaltyYards > 0 ? `+${penaltyYards}` : penaltyYards}</strong>
          <button onClick={() => setPenaltyYards((value) => value + 5)}>+</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand-mark">
          <div className="brand-ball">LS</div>
          <span>LiveSnaps</span>
        </div>
        <nav className="rail-nav" aria-label="Primary">
          <button className="rail-item active" aria-label="Game"><Gauge size={20} /></button>
          <button className="rail-item" aria-label="Roster"><Users size={20} /></button>
          <button className="rail-item" aria-label="Play log"><ClipboardList size={20} /></button>
          <button className="rail-item" aria-label="Reports"><Trophy size={20} /></button>
        </nav>
      </aside>

      <main className={`console mobile-${activeMobileTab}`}>
        <section className="management-bar">
          <div>
            <span>{gameName}</span>
            <strong>{homeTeam} vs {awayTeam}</strong>
          </div>
          <div className="utility-row">
            <select value={selectedProfileId} onChange={(event) => loadProfile(event.target.value)} aria-label="Saved games">
              <option value="">Current game</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
            <button className="ghost-button" onClick={newGame}><Plus size={16} />New</button>
            <button className="ghost-button" onClick={saveProfile}><Save size={16} />Save</button>
            <button className="ghost-button" onClick={() => setIsSetupOpen((value) => !value)}><Settings size={16} />Setup</button>
            <button className="ghost-button" onClick={exportReport}><Download size={16} />Report</button>
          </div>
        </section>

        {isSetupOpen && (
          <section className="setup-panel">
            <div className="section-title compact">
              <div>
                <span>Game Setup</span>
                <h2>Profiles, Teams, Roster</h2>
              </div>
              <button className="ghost-button danger" onClick={deleteProfile} disabled={!selectedProfileId}><Trash2 size={16} />Delete Save</button>
            </div>
            <div className="setup-grid">
              <label>Game<input value={gameName} onChange={(event) => setGameName(event.target.value)} /></label>
              <label>Home<input value={homeTeam} onChange={(event) => setHomeTeam(event.target.value)} /></label>
              <label>Away<input value={awayTeam} onChange={(event) => setAwayTeam(event.target.value)} /></label>
              <label>Quarter<input type="number" min="1" max="8" value={quarter} onChange={(event) => setQuarter(Number(event.target.value) || 1)} /></label>
              <label>Clock Seconds<input type="number" min="0" value={clock} onChange={(event) => setClock(Number(event.target.value) || 0)} /></label>
              <label>Yard Line<input type="number" min="1" max="99" value={yardLine} onChange={(event) => setYardLine(Math.min(99, Math.max(1, Number(event.target.value) || 25)))} /></label>
            </div>
            <div className="import-panel">
              <textarea value={rosterImport} onChange={(event) => setRosterImport(event.target.value)} aria-label="Roster CSV" />
              <div className="utility-row">
                <button className="ghost-button" onClick={importRoster}><Upload size={16} />Import Roster</button>
                <button className="ghost-button" onClick={exportRoster}><Download size={16} />Export Roster</button>
                <button className="ghost-button" onClick={() => setRoster(defaultRoster)}><RotateCcw size={16} />Demo Roster</button>
              </div>
            </div>
          </section>
        )}

        <header className="gamebar">
          <section className={`team-panel ${possession === 'home' ? 'possession' : ''}`}>
            <span className="team-kicker">HOME</span>
            <strong>{homeTeam}</strong>
            <div className="score-row">
              <button onClick={() => setOurScore((value) => Math.max(0, value - 1))}>-</button>
              <span>{ourScore}</span>
              <button onClick={() => setOurScore((value) => value + 1)}>+</button>
            </div>
            <button className="timeout-row timeout-button" onClick={() => setHomeTimeouts((value) => Math.max(0, value - 1))} aria-label="Use home timeout">
              {timeoutDots(homeTimeouts)}
            </button>
          </section>

          <section className="clock-panel">
            <div className="clock-main">
              <Clock size={18} />
              <span>{formatClock(clock)}</span>
            </div>
            <div className="down-distance">
              <b>Q{quarter}</b>
              <span>{down} & {distance}</span>
              <span>Ball on {yardLine}</span>
              <button onClick={() => setQuarter((value) => Math.min(8, value + 1))}>+Q</button>
            </div>
            <button className={`clock-toggle ${running ? 'running' : ''}`} onClick={() => setRunning((value) => !value)}>
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running ? 'Stop' : 'Start'}
            </button>
          </section>

          <section className={`team-panel ${possession === 'away' ? 'possession' : ''}`}>
            <span className="team-kicker">AWAY</span>
            <strong>{awayTeam}</strong>
            <div className="score-row">
              <button onClick={() => setOppScore((value) => Math.max(0, value - 1))}>-</button>
              <span>{oppScore}</span>
              <button onClick={() => setOppScore((value) => value + 1)}>+</button>
            </div>
            <button className="timeout-row timeout-button" onClick={() => setAwayTimeouts((value) => Math.max(0, value - 1))} aria-label="Use away timeout">
              {timeoutDots(awayTimeouts)}
            </button>
          </section>
        </header>

        <div className="content-grid">
          <section className="field-card">
            <div className="section-title">
              <div>
                <span>Live Formation</span>
                <h1>{phase} Console</h1>
              </div>
              <div className="phase-tabs">
                {(Object.keys(phaseMeta) as Phase[]).map((item) => (
                  <button key={item} className={`${phaseMeta[item].className} ${phase === item ? 'selected' : ''}`} onClick={() => setPhaseAndResult(item)}>
                    {phaseMeta[item].icon}
                    {phaseMeta[item].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-wrap">
              <div className="football-field">
                <div className="yard-line line-20">20</div>
                <div className="yard-line line-30">30</div>
                <div className="yard-line line-40">40</div>
                <div className="yard-line line-50">50</div>
                <div className="scrimmage" style={{ left: `${Math.min(86, Math.max(14, yardLine))}%` }}>
                  <span>LOS</span>
                </div>
                {fieldSlots.map((slot, index) => {
                  const player = selectedRoster[index];
                  return (
                    <button key={`${slot.role}-${index}`} className={`player-dot ${player ? 'filled' : ''}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
                      <small>{slot.role}</small>
                      <strong>{player ? `#${player.number}` : '+'}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky-action">
              <div>
                <span>Next Play</span>
                <strong>#{plays.length + 1} - {currentResult.label} ({netYards > 0 ? `+${netYards}` : netYards})</strong>
              </div>
              <div className="action-meta">
                <span>{selectedPlayers.length}/11 selected</span>
                <button className="desktop-save-action" onClick={logPlay}><Plus size={18} />Save Play</button>
                <button className="mobile-log-action" onClick={() => setIsResultSheetOpen(true)}><Plus size={18} />Log Play</button>
              </div>
            </div>
          </section>

          <aside className="right-panel">
            <section className="quick-card result-card">
              <div className="section-title compact">
                <div>
                  <span>Result</span>
                  <h2>One-Tap Log</h2>
                </div>
                <Flag size={20} />
              </div>
              {resultControls}
            </section>

            <section className="quick-card roster-card">
              <div className="section-title compact">
                <div>
                  <span>Roster</span>
                  <h2>{readyCount} Ready</h2>
                </div>
                <Shirt size={20} />
              </div>
              <div className="player-tray">
                {roster.map((player) => (
                  <button key={player.id} className={`roster-chip ${selectedPlayers.includes(player.id) ? 'selected' : ''} ${player.status.toLowerCase()}`} onClick={() => togglePlayer(player.id)}>
                    <b>#{player.number}</b>
                    <span>{player.name}</span>
                    <small>{player.role}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="quick-card rail-log-card">
              <div className="section-title compact">
                <div>
                  <span>Game Flow</span>
                  <h2>Recent Plays</h2>
                </div>
                <ClipboardList size={20} />
              </div>
              <div className="stats-grid">
                <div><span>Net Off</span><strong>{offenseTotal}</strong></div>
                <div><span>Stops</span><strong>{defensiveStops}</strong></div>
              </div>
              <div className="rail-play-list">
                {plays.slice(0, 5).map((play) => (
                  <article key={play.id} className={`rail-play ${play.phase.toLowerCase()}`}>
                    <div>
                      <b>{play.result}</b>
                      <span>Q{play.quarter} {play.clock} - {play.down} & {play.distance}</span>
                    </div>
                    <strong>{play.yards + play.penalty > 0 ? `+${play.yards + play.penalty}` : play.yards + play.penalty}</strong>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="log-strip">
          <div className="section-title compact">
            <div>
              <span>Game Flow</span>
              <h2>Recent Plays</h2>
            </div>
            <div className="log-actions">
              <button className="ghost-button" onClick={undoLastPlay} disabled={undoStack.length === 0}><RotateCcw size={16} />Undo</button>
              <button className="ghost-button" onClick={resetGame}><RotateCcw size={16} />Reset</button>
              <button className="ghost-button" onClick={exportReport}><FileText size={16} />Export</button>
            </div>
          </div>
          <div className="play-list">
            {plays.length === 0 ? (
              <div className="empty-log"><ListChecks size={22} /><span>No plays logged yet. Select a result and save the first snap.</span></div>
            ) : (
              plays.map((play) => (
                <article key={play.id} className={`play-row ${play.phase.toLowerCase()}`}>
                  <div>
                    <b>{play.result}</b>
                    <span>Q{play.quarter} - {play.phase} - {play.down} & {play.distance} - {play.note}</span>
                  </div>
                  <strong>{play.yards + play.penalty > 0 ? `+${play.yards + play.penalty}` : play.yards + play.penalty} yd</strong>
                  <span>{play.clock}</span>
                  <span>{play.score}</span>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {isResultSheetOpen && (
        <div className="result-sheet" role="dialog" aria-modal="true" aria-label="Log play result">
          <button className="sheet-backdrop" onClick={() => setIsResultSheetOpen(false)} aria-label="Close result sheet" />
          <section className="sheet-panel">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div>
                <span>Log Play</span>
                <h2>Choose Result</h2>
              </div>
              <button onClick={() => setIsResultSheetOpen(false)}>Close</button>
            </div>
            <div className="phase-tabs sheet-tabs">
              {(Object.keys(phaseMeta) as Phase[]).map((item) => (
                <button key={item} className={`${phaseMeta[item].className} ${phase === item ? 'selected' : ''}`} onClick={() => setPhaseAndResult(item)}>
                  {phaseMeta[item].icon}
                  {phaseMeta[item].label}
                </button>
              ))}
            </div>
            <div className="sheet-results">{resultControls}</div>
            <div className="sheet-summary">
              <div>
                <span>Next</span>
                <strong>#{plays.length + 1} - {currentResult.label}</strong>
              </div>
              <div>
                <span>Game State</span>
                <strong>Q{quarter} {down} & {distance} - {formatClock(clock)}</strong>
              </div>
            </div>
            <button className="sheet-save" onClick={logPlay}><Plus size={19} />Save Play</button>
          </section>
        </div>
      )}

      <div className="mobile-tabbar">
        <button className={activeMobileTab === 'game' ? 'active' : ''} onClick={() => setActiveMobileTab('game')}><Activity size={18} />Game</button>
        <button className={activeMobileTab === 'roster' ? 'active' : ''} onClick={() => setActiveMobileTab('roster')}><Users size={18} />Roster</button>
        <button className={activeMobileTab === 'clock' ? 'active' : ''} onClick={() => setActiveMobileTab('clock')}><TimerReset size={18} />Clock</button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
