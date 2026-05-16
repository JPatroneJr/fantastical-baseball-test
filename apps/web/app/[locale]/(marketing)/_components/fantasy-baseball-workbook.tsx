'use client';

import {
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import {
  ArrowRightLeft,
  BarChart3,
  FileText,
  FolderOpen,
  Play,
  Plus,
  Save,
  Table2,
} from 'lucide-react';

import {
  createGame,
  createId,
  createPlayer,
  getCurrentBatter,
  getTeamAverage,
  resolveTrade,
  simulatePitch,
  type GameState,
  type Player,
  type PlayerPosition,
  type Team,
} from '../_lib/fantasy-simulator';

const STORAGE_KEY = 'fantastical-baseball-workbook-v1';
const POSITIONS: PlayerPosition[] = [
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
  'P',
];

const seedTeams: Team[] = [
  {
    id: 'formula-foxes',
    name: 'Formula Foxes',
    color: '#217346',
    roster: [
      player('Maddox Vail', 'CF', 88, 64, 92, 40),
      player('Elena Cross', 'SS', 84, 71, 77, 38),
      player('Theo Banks', '1B', 72, 92, 45, 34),
      player('Nora Quinn', 'P', 42, 39, 48, 89),
      player('Cal Mercer', 'RF', 79, 83, 70, 36),
    ],
  },
  {
    id: 'ribbon-ravens',
    name: 'Ribbon Ravens',
    color: '#185abd',
    roster: [
      player('Ivy Shaw', '2B', 91, 58, 86, 41),
      player('Marco Lane', 'LF', 76, 88, 73, 37),
      player('Selah Hart', 'C', 70, 78, 52, 66),
      player('Jonah Price', 'P', 38, 35, 43, 91),
      player('Rafa Silva', '3B', 82, 81, 68, 40),
    ],
  },
  {
    id: 'pivot-pilots',
    name: 'Pivot Pilots',
    color: '#c43e1c',
    roster: [
      player('Ari Stone', 'SS', 80, 74, 83, 45),
      player('June Park', 'P', 35, 34, 46, 86),
      player('Remy Cole', 'RF', 74, 90, 62, 33),
      player('Gia Vale', 'CF', 86, 65, 95, 39),
      player('Owen Reid', '1B', 69, 94, 44, 31),
    ],
  },
];

interface PersistedState {
  teams: Team[];
  awayTeamId: string;
  homeTeamId: string;
}

export function FantasyBaseballWorkbook() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [teams, setTeams] = useState<Team[]>(seedTeams);
  const [awayTeamId, setAwayTeamId] = useState(seedTeams[0]!.id);
  const [homeTeamId, setHomeTeamId] = useState(seedTeams[1]!.id);
  const [selectedTeamId, setSelectedTeamId] = useState(() => seedTeams[0]!.id);
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] =
    useState<PlayerPosition>('CF');
  const [tradeFromTeamId, setTradeFromTeamId] = useState(seedTeams[0]!.id);
  const [tradeToTeamId, setTradeToTeamId] = useState(seedTeams[1]!.id);
  const [tradeFromPlayerId, setTradeFromPlayerId] = useState('');
  const [tradeToPlayerId, setTradeToPlayerId] = useState('');
  const [game, setGame] = useState<GameState>(() =>
    createGame(seedTeams[0]!, seedTeams[1]!),
  );

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0]!;
  const awayTeam = teams.find((team) => team.id === awayTeamId) ?? teams[0]!;
  const homeTeam =
    teams.find((team) => team.id === homeTeamId && team.id !== awayTeam.id) ??
    teams.find((team) => team.id !== awayTeam.id) ??
    teams[1]!;
  const tradeFromTeam =
    teams.find((team) => team.id === tradeFromTeamId) ?? teams[0]!;
  const tradeToTeam =
    teams.find((team) => team.id === tradeToTeamId && team.id !== tradeFromTeam.id) ??
    teams.find((team) => team.id !== tradeFromTeam.id) ??
    teams[1]!;
  const currentBatter = getCurrentBatter(game, game[game.battingTeam]);
  const topPlayers = useMemo(
    () =>
      teams
        .flatMap((team) =>
          team.roster.map((rosterPlayer) => ({
            ...rosterPlayer,
            teamName: team.name,
            value: playerValue(rosterPlayer),
          })),
        )
        .slice()
        .sort((first, second) => second.value - first.value)
        .slice(0, 8),
    [teams],
  );

  useEffect(() => {
    const persistedState = loadState();

    setTeams(persistedState.teams);
    setAwayTeamId(persistedState.awayTeamId);
    setHomeTeamId(persistedState.homeTeamId);
    setSelectedTeamId(persistedState.teams[0]?.id ?? seedTeams[0]!.id);
    setTradeFromTeamId(persistedState.teams[0]?.id ?? seedTeams[0]!.id);
    setTradeToTeamId(persistedState.teams[1]?.id ?? seedTeams[1]!.id);
    setGame(
      createGame(
        persistedState.teams[0] ?? seedTeams[0]!,
        persistedState.teams[1] ?? seedTeams[1]!,
      ),
    );
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const state: PersistedState = {
      teams,
      awayTeamId,
      homeTeamId,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [awayTeamId, homeTeamId, isHydrated, teams]);

  useEffect(() => {
    setTradeFromPlayerId(tradeFromTeam.roster[0]?.id ?? '');
  }, [tradeFromTeam]);

  useEffect(() => {
    setTradeToPlayerId(tradeToTeam.roster[0]?.id ?? '');
  }, [tradeToTeam]);

  function addTeam() {
    const name = newTeamName.trim();

    if (!name) {
      return;
    }

    const newTeam: Team = {
      id: createId('team'),
      name,
      color: pickTeamColor(teams.length),
      roster: [],
    };

    setTeams((currentTeams) => [...currentTeams, newTeam]);
    setSelectedTeamId(newTeam.id);
    setNewTeamName('');
  }

  function addPlayer() {
    const name = newPlayerName.trim();

    if (!name) {
      return;
    }

    setTeams((currentTeams) =>
      currentTeams.map((team) =>
        team.id === selectedTeam.id
          ? {
              ...team,
              roster: [
                ...team.roster,
                createPlayer(name, newPlayerPosition, selectedTeam.id),
              ],
            }
          : team,
      ),
    );
    setNewPlayerName('');
  }

  function performTrade() {
    if (
      tradeFromTeam.id === tradeToTeam.id ||
      !tradeFromPlayerId ||
      !tradeToPlayerId
    ) {
      return;
    }

    const [updatedFromTeam, updatedToTeam] = resolveTrade(
      tradeFromTeam,
      tradeToTeam,
      tradeFromPlayerId,
      tradeToPlayerId,
    );

    setTeams((currentTeams) =>
      currentTeams.map((team) => {
        if (team.id === updatedFromTeam.id) {
          return updatedFromTeam;
        }

        if (team.id === updatedToTeam.id) {
          return updatedToTeam;
        }

        return team;
      }),
    );
  }

  function startGame() {
    const nextAway = teams.find((team) => team.id === awayTeam.id) ?? teams[0]!;
    const nextHome = teams.find((team) => team.id === homeTeam.id) ?? teams[1]!;

    setGame(createGame(nextAway, nextHome));
  }

  function pitch() {
    setGame((currentGame) => simulatePitch(currentGame));
  }

  return (
    <main className="min-h-screen bg-[#f3f2f1] text-[#252423]">
      <OfficeTitleBar />

      <section className="border-b border-[#d0d0d0] bg-white">
        <div className="flex flex-wrap items-end gap-1 border-b border-[#e1dfdd] px-3 pt-1 text-[13px]">
          {['File', 'Home', 'Insert', 'Formulas', 'Review', 'View'].map((tab) => (
            <button
              className={`h-8 border-b-2 px-3 ${
                tab === 'Home'
                  ? 'border-[#217346] text-[#217346]'
                  : 'border-transparent text-[#605e5c] hover:text-[#252423]'
              }`}
              key={tab}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 px-3 py-2">
          <RibbonButton icon={<Save />} label="Save" />
          <RibbonButton icon={<FolderOpen />} label="Open" />
          <RibbonButton icon={<Table2 />} label="Roster" active />
          <RibbonButton icon={<ArrowRightLeft />} label="Trade" />
          <RibbonButton icon={<Play />} label="Pitch" onClick={pitch} />
          <RibbonButton icon={<BarChart3 />} label="Model" />
          <RibbonButton icon={<FileText />} label="Memo" />
        </div>

        <div className="grid grid-cols-[52px_1fr] border-t border-[#e1dfdd] text-[13px]">
          <div className="border-r border-[#d0d0d0] bg-[#f8f8f8] px-2 py-1 text-center text-[#605e5c]">
            fx
          </div>
          <div className="truncate px-3 py-1 font-mono text-[#3b3a39]">
            =LIVEPITCH({game.away.name},{game.home.name},{game.half}
            {game.inning})
          </div>
        </div>
      </section>

      <section className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1.3fr)_390px]">
        <div className="grid gap-3">
          <WorkbookPanel>
            <div className="grid gap-3 lg:grid-cols-[250px_1fr]">
              <aside className="border-r border-[#d0d0d0] pr-3">
                <PanelHeader title="Workbook" subtitle="Teams and sheets" />
                <div className="mt-3 grid gap-1">
                  {teams.map((team) => (
                    <button
                      className={`flex items-center justify-between rounded-sm border px-2 py-2 text-left text-sm ${
                        selectedTeam.id === team.id
                          ? 'border-[#217346] bg-[#e7f2e8]'
                          : 'border-transparent hover:border-[#d0d0d0] hover:bg-white'
                      }`}
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="truncate">{team.name}</span>
                      </span>
                      <span className="font-mono text-xs text-[#605e5c]">
                        {team.roster.length}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-2">
                  <Input
                    onChange={setNewTeamName}
                    placeholder="New team"
                    value={newTeamName}
                  />
                  <ActionButton icon={<Plus />} label="Add Team" onClick={addTeam} />
                </div>
              </aside>

              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <PanelHeader
                    title={`${selectedTeam.name} Roster`}
                    subtitle={`${selectedTeam.roster.length} players, ${getTeamAverage(selectedTeam)} OVR`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Input
                      onChange={setNewPlayerName}
                      placeholder="Player name"
                      value={newPlayerName}
                    />
                    <select
                      className="h-8 rounded-sm border border-[#a19f9d] bg-white px-2 text-sm"
                      onChange={(event) =>
                        setNewPlayerPosition(event.target.value as PlayerPosition)
                      }
                      value={newPlayerPosition}
                    >
                      {POSITIONS.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                    <ActionButton
                      icon={<Plus />}
                      label="Add Player"
                      onClick={addPlayer}
                    />
                  </div>
                </div>

                <RosterGrid team={selectedTeam} />
              </div>
            </div>
          </WorkbookPanel>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <WorkbookPanel>
              <PanelHeader title="Trade Desk" subtitle="Swap selected contracts" />
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                <TradeColumn
                  playerId={tradeFromPlayerId}
                  setPlayerId={setTradeFromPlayerId}
                  setTeamId={setTradeFromTeamId}
                  team={tradeFromTeam}
                  teamId={tradeFromTeamId}
                  teams={teams}
                />
                <button
                  className="self-end rounded-sm border border-[#217346] bg-[#217346] px-3 py-2 text-sm font-medium text-white hover:bg-[#1b5f39]"
                  onClick={performTrade}
                  type="button"
                >
                  <ArrowRightLeft className="mx-auto size-4" />
                  Trade
                </button>
                <TradeColumn
                  playerId={tradeToPlayerId}
                  setPlayerId={setTradeToPlayerId}
                  setTeamId={setTradeToTeamId}
                  team={tradeToTeam}
                  teamId={tradeToTeamId}
                  teams={teams}
                />
              </div>
            </WorkbookPanel>

            <WorkbookPanel>
              <PanelHeader title="League Leaders" subtitle="Front office model" />
              <div className="mt-3 overflow-hidden rounded-sm border border-[#d0d0d0]">
                {topPlayers.map((topPlayer, index) => (
                  <div
                    className="grid grid-cols-[34px_1fr_52px] items-center border-b border-[#edebe9] bg-white px-2 py-1.5 text-sm last:border-b-0"
                    key={topPlayer.id}
                  >
                    <span className="font-mono text-xs text-[#605e5c]">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {topPlayer.name}
                      </span>
                      <span className="block truncate text-xs text-[#605e5c]">
                        {topPlayer.position} - {topPlayer.teamName}
                      </span>
                    </span>
                    <span className="text-right font-mono text-sm">
                      {topPlayer.value}
                    </span>
                  </div>
                ))}
              </div>
            </WorkbookPanel>
          </div>
        </div>

        <aside className="grid gap-3">
          <WorkbookPanel>
            <PanelHeader title="Live Game" subtitle="Pitch-by-pitch simulation" />
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <TeamSelect
                label="Away"
                onChange={setAwayTeamId}
                teams={teams}
                value={awayTeam.id}
              />
              <span className="pt-5 text-xs text-[#605e5c]">at</span>
              <TeamSelect
                label="Home"
                onChange={setHomeTeamId}
                teams={teams.filter((team) => team.id !== awayTeam.id)}
                value={homeTeam.id}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <ActionButton icon={<Play />} label="New Game" onClick={startGame} />
              <ActionButton icon={<Play />} label="Throw Pitch" onClick={pitch} />
            </div>

            <div className="mt-4 rounded-sm border border-[#d0d0d0] bg-[#fbfbfb]">
              <div className="grid grid-cols-[1fr_72px] border-b border-[#d0d0d0] text-sm">
                <ScoreRow score={game.score.away} team={game.away} />
                <ScoreRow score={game.score.home} team={game.home} />
              </div>

              <div className="grid grid-cols-4 gap-px bg-[#d0d0d0] text-center text-sm">
                <StatBox label="Inning" value={`${game.half} ${game.inning}`} />
                <StatBox label="Outs" value={game.outs} />
                <StatBox
                  label="Count"
                  value={`${game.count.balls}-${game.count.strikes}`}
                />
                <StatBox label="Pitch" value={game.pitchNumber} />
              </div>

              <Diamond bases={game.bases} />

              <div className="border-t border-[#d0d0d0] px-3 py-2 text-sm">
                <span className="text-[#605e5c]">At bat </span>
                <span className="font-medium">{currentBatter.name}</span>
                <span className="text-[#605e5c]">, {currentBatter.position}</span>
              </div>
            </div>
          </WorkbookPanel>

          <WorkbookPanel className="bg-[#fbfbfb]">
            <PanelHeader title="Scouting Memo" subtitle="Word mode" />
            <article className="mt-4 min-h-[270px] rounded-sm border border-[#d0d0d0] bg-white px-8 py-7 shadow-sm">
              <h1 className="text-center text-xl font-semibold text-[#2b579a]">
                Confidential Baseball Operations Memo
              </h1>
              <p className="mt-5 text-sm leading-6 text-[#323130]">
                {selectedTeam.name} currently grades at{' '}
                <strong>{getTeamAverage(selectedTeam)} overall</strong>. The
                live model favors contact and pitcher command, with speed adding
                extra-base pressure once the ball is in play.
              </p>
              <p className="mt-4 text-sm leading-6 text-[#323130]">
                Active game: {game.away.name} {game.score.away}, {game.home.name}{' '}
                {game.score.home}. Next pitch logged under workbook formula{' '}
                <span className="font-mono">LIVEPITCH()</span>.
              </p>
              <div className="mt-6 border-t border-[#d0d0d0] pt-3 text-xs text-[#605e5c]">
                Prepared for Baseball Ops - internal workbook view
              </div>
            </article>
          </WorkbookPanel>

          <WorkbookPanel>
            <PanelHeader title="Pitch Log" subtitle="Recent sequence" />
            <div className="mt-3 max-h-[260px] overflow-auto border border-[#d0d0d0]">
              {(game.log.length > 0 ? game.log : placeholderLog()).map((entry) => (
                <div
                  className="grid grid-cols-[70px_1fr_72px] border-b border-[#edebe9] bg-white px-2 py-1.5 text-xs last:border-b-0"
                  key={entry.id}
                >
                  <span className="font-mono text-[#605e5c]">{entry.inning}</span>
                  <span className="min-w-0 truncate">
                    {entry.pitcher} to {entry.batter}: {entry.result}
                  </span>
                  <span className="text-right font-mono">{entry.score}</span>
                </div>
              ))}
            </div>
          </WorkbookPanel>
        </aside>
      </section>
    </main>
  );
}

function OfficeTitleBar() {
  return (
    <header className="flex min-h-11 items-center justify-between bg-[#217346] px-3 text-white">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-7 place-items-center rounded-sm bg-white/15">
          <Table2 className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            Q2 Revenue Forecast - BaseballOps.xlsx
          </div>
          <div className="truncate text-xs text-white/75">Saved to OneDrive</div>
        </div>
      </div>
      <div className="hidden text-xs text-white/80 sm:block">Office Mode</div>
    </header>
  );
}

function RibbonButton({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={`flex h-14 w-[76px] flex-col items-center justify-center gap-1 rounded-sm border text-xs ${
        active
          ? 'border-[#bad80a] bg-[#eef7ee]'
          : 'border-transparent hover:border-[#d0d0d0] hover:bg-[#f8f8f8]'
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="text-[#217346] [&_svg]:size-4">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function WorkbookPanel({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={`rounded-sm border border-[#c8c6c4] bg-[#f8f8f8] p-3 shadow-[0_1px_1px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="truncate text-base font-semibold text-[#252423]">{title}</h2>
      <p className="truncate text-xs text-[#605e5c]">{subtitle}</p>
    </div>
  );
}

function Input({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <input
      className="h-8 min-w-0 rounded-sm border border-[#a19f9d] bg-white px-2 text-sm outline-none focus:border-[#217346] focus:ring-1 focus:ring-[#217346]"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-[#217346] bg-white px-2.5 text-sm font-medium text-[#217346] hover:bg-[#e7f2e8]"
      onClick={onClick}
      type="button"
    >
      <span className="[&_svg]:size-4">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function RosterGrid({ team }: { team: Team }) {
  return (
    <div className="overflow-auto rounded-sm border border-[#d0d0d0] bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#f3f2f1] text-left text-xs text-[#605e5c]">
            {['Row', 'Player', 'Pos', 'CON', 'PWR', 'SPD', 'CMD', 'Value'].map(
              (heading) => (
                <th className="border border-[#d0d0d0] px-2 py-1" key={heading}>
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {team.roster.map((rosterPlayer, index) => (
            <tr className="hover:bg-[#eef7ee]" key={rosterPlayer.id}>
              <td className="border border-[#edebe9] bg-[#f8f8f8] px-2 py-1 font-mono text-xs text-[#605e5c]">
                {index + 1}
              </td>
              <td className="border border-[#edebe9] px-2 py-1 font-medium">
                {rosterPlayer.name}
              </td>
              <td className="border border-[#edebe9] px-2 py-1">
                {rosterPlayer.position}
              </td>
              <RatingCell value={rosterPlayer.contact} />
              <RatingCell value={rosterPlayer.power} />
              <RatingCell value={rosterPlayer.speed} />
              <RatingCell value={rosterPlayer.command} />
              <td className="border border-[#edebe9] px-2 py-1 font-mono">
                {playerValue(rosterPlayer)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatingCell({ value }: { value: number }) {
  return (
    <td className="border border-[#edebe9] px-2 py-1">
      <div className="flex items-center gap-2">
        <span className="w-7 font-mono text-xs">{value}</span>
        <span className="h-1.5 flex-1 rounded-full bg-[#edebe9]">
          <span
            className="block h-full rounded-full bg-[#217346]"
            style={{ width: `${value}%` }}
          />
        </span>
      </div>
    </td>
  );
}

function TradeColumn({
  playerId,
  setPlayerId,
  setTeamId,
  team,
  teamId,
  teams,
}: {
  playerId: string;
  setPlayerId: (value: string) => void;
  setTeamId: (value: string) => void;
  team: Team;
  teamId: string;
  teams: Team[];
}) {
  return (
    <div className="grid gap-2">
      <TeamSelect label="Team" onChange={setTeamId} teams={teams} value={teamId} />
      <label className="grid gap-1 text-xs text-[#605e5c]">
        Player
        <select
          className="h-8 rounded-sm border border-[#a19f9d] bg-white px-2 text-sm text-[#252423]"
          onChange={(event) => setPlayerId(event.target.value)}
          value={playerId}
        >
          {team.roster.map((rosterPlayer) => (
            <option key={rosterPlayer.id} value={rosterPlayer.id}>
              {rosterPlayer.name} ({rosterPlayer.position})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TeamSelect({
  label,
  onChange,
  teams,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  teams: Team[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs text-[#605e5c]">
      {label}
      <select
        className="h-8 min-w-0 rounded-sm border border-[#a19f9d] bg-white px-2 text-sm text-[#252423]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScoreRow({ score, team }: { score: number; team: Team }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-[#edebe9] px-3 py-2">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: team.color }}
        />
        <span className="truncate font-medium">{team.name}</span>
      </div>
      <div className="border-b border-[#edebe9] px-3 py-2 text-right font-mono text-lg">
        {score}
      </div>
    </>
  );
}

function StatBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-white px-2 py-2">
      <div className="text-[11px] text-[#605e5c]">{label}</div>
      <div className="truncate font-mono text-sm">{value}</div>
    </div>
  );
}

function Diamond({ bases }: { bases: GameState['bases'] }) {
  return (
    <div className="grid place-items-center bg-white py-6">
      <div className="relative size-32 rotate-45 border border-[#d0d0d0] bg-[#f3f2f1]">
        <Base occupied={Boolean(bases.first)} className="right-1 top-1" />
        <Base occupied={Boolean(bases.second)} className="left-1 top-1" />
        <Base occupied={Boolean(bases.third)} className="bottom-1 left-1" />
        <Base occupied={false} className="bottom-1 right-1" home />
      </div>
    </div>
  );
}

function Base({
  className,
  home,
  occupied,
}: {
  className: string;
  home?: boolean;
  occupied: boolean;
}) {
  return (
    <span
      className={`absolute size-5 border border-[#a19f9d] ${
        occupied ? 'bg-[#217346]' : home ? 'bg-[#2b579a]' : 'bg-white'
      } ${className}`}
    />
  );
}

function player(
  name: string,
  position: PlayerPosition,
  contact: number,
  power: number,
  speed: number,
  command: number,
): Player {
  return {
    id: `seed-${name.toLowerCase().replaceAll(' ', '-')}`,
    name,
    position,
    contact,
    power,
    speed,
    command,
  };
}

function playerValue(rosterPlayer: Player) {
  return Math.round(
    rosterPlayer.contact * 0.3 +
      rosterPlayer.power * 0.27 +
      rosterPlayer.speed * 0.18 +
      rosterPlayer.command * 0.25,
  );
}

function pickTeamColor(index: number) {
  return ['#217346', '#185abd', '#c43e1c', '#8764b8', '#b7472a'][index % 5]!;
}

function loadState(): PersistedState {
  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      throw new Error('No workbook state');
    }

    const parsed = JSON.parse(rawState) as PersistedState;

    if (!Array.isArray(parsed.teams) || parsed.teams.length < 2) {
      throw new Error('Invalid workbook state');
    }

    return parsed;
  } catch {
    return {
      teams: seedTeams,
      awayTeamId: seedTeams[0]!.id,
      homeTeamId: seedTeams[1]!.id,
    };
  }
}

function placeholderLog() {
  return [
    {
      id: 'placeholder',
      inning: 'Top 1',
      pitcher: 'System',
      batter: 'Workbook',
      pitch: 'Four-seam',
      result: 'Ball' as const,
      count: '0-0',
      score: '0-0',
    },
  ];
}
