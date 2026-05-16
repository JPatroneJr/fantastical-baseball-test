export type PlayerPosition =
  | 'C'
  | '1B'
  | '2B'
  | '3B'
  | 'SS'
  | 'LF'
  | 'CF'
  | 'RF'
  | 'P';

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  contact: number;
  power: number;
  speed: number;
  command: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  roster: Player[];
}

export interface BaseState {
  first: Player | null;
  second: Player | null;
  third: Player | null;
}

export interface GameState {
  away: Team;
  home: Team;
  inning: number;
  half: 'Top' | 'Bottom';
  battingTeam: 'away' | 'home';
  outs: number;
  count: {
    balls: number;
    strikes: number;
  };
  bases: BaseState;
  score: {
    away: number;
    home: number;
  };
  batterIndex: {
    away: number;
    home: number;
  };
  pitchNumber: number;
  log: PitchLogEntry[];
  status: 'pregame' | 'live' | 'final';
}

export interface PitchLogEntry {
  id: string;
  inning: string;
  pitcher: string;
  batter: string;
  pitch: string;
  result: PitchResult;
  count: string;
  score: string;
}

export type PitchResult =
  | 'Ball'
  | 'Called Strike'
  | 'Foul'
  | 'Swinging Strike'
  | 'Single'
  | 'Double'
  | 'Triple'
  | 'Home Run'
  | 'Groundout'
  | 'Flyout'
  | 'Lineout';

const PITCH_TYPES = ['Four-seam', 'Slider', 'Changeup', 'Curveball', 'Sinker'];

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createGame(away: Team, home: Team): GameState {
  return {
    away,
    home,
    inning: 1,
    half: 'Top',
    battingTeam: 'away',
    outs: 0,
    count: {
      balls: 0,
      strikes: 0,
    },
    bases: emptyBases(),
    score: {
      away: 0,
      home: 0,
    },
    batterIndex: {
      away: 0,
      home: 0,
    },
    pitchNumber: 0,
    log: [],
    status: 'pregame',
  };
}

export function createPlayer(
  name: string,
  position: PlayerPosition,
  teamId: string,
): Player {
  const seed = name
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), teamId.length);

  return {
    id: createId('player'),
    name,
    position,
    contact: clampRating(48 + (seed % 45)),
    power: clampRating(42 + ((seed * 3) % 50)),
    speed: clampRating(44 + ((seed * 5) % 48)),
    command: clampRating(position === 'P' ? 62 + (seed % 30) : 28 + (seed % 35)),
  };
}

export function getTeamAverage(team: Team) {
  if (team.roster.length === 0) {
    return 0;
  }

  const total = team.roster.reduce((sum, player) => {
    return (
      sum +
      (player.contact + player.power + player.speed + player.command) / 4
    );
  }, 0);

  return Math.round(total / team.roster.length);
}

export function resolveTrade(
  firstTeam: Team,
  secondTeam: Team,
  firstPlayerId: string,
  secondPlayerId: string,
): [Team, Team] {
  const firstPlayer = firstTeam.roster.find((player) => player.id === firstPlayerId);
  const secondPlayer = secondTeam.roster.find(
    (player) => player.id === secondPlayerId,
  );

  if (!firstPlayer || !secondPlayer) {
    return [firstTeam, secondTeam];
  }

  return [
    {
      ...firstTeam,
      roster: firstTeam.roster.map((player) =>
        player.id === firstPlayerId ? secondPlayer : player,
      ),
    },
    {
      ...secondTeam,
      roster: secondTeam.roster.map((player) =>
        player.id === secondPlayerId ? firstPlayer : player,
      ),
    },
  ];
}

export function simulatePitch(
  game: GameState,
  random: () => number = Math.random,
): GameState {
  if (game.status === 'final') {
    return game;
  }

  const battingTeam = game[game.battingTeam];
  const fieldingTeam = game.battingTeam === 'away' ? game.home : game.away;
  const batter = getCurrentBatter(game, battingTeam);
  const pitcher = getPitcher(fieldingTeam);
  const pitch = PITCH_TYPES[Math.floor(random() * PITCH_TYPES.length)] ?? 'Four-seam';
  const outcome = getPitchOutcome(game, batter, pitcher, random());
  const nextGame = applyOutcome(game, batter, outcome);
  const logEntry = buildLogEntry(game, nextGame, batter, pitcher, pitch, outcome);

  return {
    ...nextGame,
    pitchNumber: nextGame.pitchNumber + 1,
    log: [logEntry, ...nextGame.log].slice(0, 18),
    status: nextGame.status === 'final' ? 'final' : 'live',
  };
}

export function getCurrentBatter(game: GameState, team: Team) {
  const roster = team.roster.length > 0 ? team.roster : [replacementPlayer(team.id)];
  return roster[game.batterIndex[game.battingTeam] % roster.length] ?? roster[0]!;
}

function getPitcher(team: Team) {
  return (
    team.roster.find((player) => player.position === 'P') ??
    team.roster[0] ??
    replacementPlayer(team.id)
  );
}

function getPitchOutcome(
  game: GameState,
  batter: Player,
  pitcher: Player,
  roll: number,
): PitchResult {
  const hitterEdge =
    batter.contact * 0.38 +
    batter.power * 0.3 +
    batter.speed * 0.08 -
    pitcher.command * 0.34;
  const contactBand = 0.31 + hitterEdge / 300;
  const powerBand = 0.08 + batter.power / 620;

  if (roll < 0.28 - pitcher.command / 900 + game.count.balls * 0.02) {
    return 'Ball';
  }

  if (roll < 0.48 - batter.contact / 1000 + game.count.strikes * 0.015) {
    return roll < 0.38 ? 'Called Strike' : 'Swinging Strike';
  }

  if (roll < 0.56) {
    return 'Foul';
  }

  if (roll < 0.56 + contactBand) {
    if (roll > 0.985 - powerBand) {
      return 'Home Run';
    }

    if (roll > 0.94 - batter.speed / 1500) {
      return 'Triple';
    }

    if (roll > 0.86 - batter.power / 1200) {
      return 'Double';
    }

    return 'Single';
  }

  if (roll > 0.86) {
    return 'Flyout';
  }

  return roll > 0.72 ? 'Lineout' : 'Groundout';
}

function applyOutcome(
  game: GameState,
  batter: Player,
  outcome: PitchResult,
): GameState {
  if (outcome === 'Ball') {
    const balls = game.count.balls + 1;

    if (balls >= 4) {
      return advanceBatter(game, batter, 1);
    }

    return {
      ...game,
      count: {
        ...game.count,
        balls,
      },
    };
  }

  if (outcome === 'Foul') {
    return {
      ...game,
      count: {
        ...game.count,
        strikes: Math.min(2, game.count.strikes + 1),
      },
    };
  }

  if (outcome === 'Called Strike' || outcome === 'Swinging Strike') {
    const strikes = game.count.strikes + 1;

    if (strikes >= 3) {
      return recordOut(game);
    }

    return {
      ...game,
      count: {
        ...game.count,
        strikes,
      },
    };
  }

  if (outcome === 'Single') {
    return advanceBatter(game, batter, 1);
  }

  if (outcome === 'Double') {
    return advanceBatter(game, batter, 2);
  }

  if (outcome === 'Triple') {
    return advanceBatter(game, batter, 3);
  }

  if (outcome === 'Home Run') {
    return advanceBatter(game, batter, 4);
  }

  return recordOut(game);
}

function advanceBatter(game: GameState, batter: Player, bases: 1 | 2 | 3 | 4) {
  const runners = [
    { player: game.bases.third, base: 3 },
    { player: game.bases.second, base: 2 },
    { player: game.bases.first, base: 1 },
    { player: batter, base: 0 },
  ];
  const nextBases = emptyBases();
  let runs = 0;

  for (const runner of runners) {
    if (!runner.player) {
      continue;
    }

    const destination = runner.base + bases;

    if (destination >= 4) {
      runs += 1;
    } else if (destination === 3) {
      nextBases.third = runner.player;
    } else if (destination === 2) {
      nextBases.second = runner.player;
    } else {
      nextBases.first = runner.player;
    }
  }

  return completePlateAppearance({
    ...game,
    bases: nextBases,
    score: {
      ...game.score,
      [game.battingTeam]: game.score[game.battingTeam] + runs,
    },
  });
}

function recordOut(game: GameState) {
  const outs = game.outs + 1;

  if (outs < 3) {
    return completePlateAppearance({
      ...game,
      outs,
    });
  }

  const bottomOfFinal =
    game.half === 'Bottom' &&
    game.inning >= 9 &&
    game.score.home !== game.score.away;

  if (bottomOfFinal) {
    return {
      ...completePlateAppearance(game),
      outs: 3,
      status: 'final',
    };
  }

  return switchSides(completePlateAppearance(game));
}

function switchSides(game: GameState): GameState {
  const nextHalf = game.half === 'Top' ? 'Bottom' : 'Top';
  const nextInning = game.half === 'Bottom' ? game.inning + 1 : game.inning;
  const nextBattingTeam = game.battingTeam === 'away' ? 'home' : 'away';
  const finalAfterTopNine =
    game.half === 'Top' &&
    game.inning >= 9 &&
    game.score.home > game.score.away;

  if (finalAfterTopNine) {
    return {
      ...game,
      outs: 3,
      count: { balls: 0, strikes: 0 },
      status: 'final',
    };
  }

  return {
    ...game,
    inning: nextInning,
    half: nextHalf,
    battingTeam: nextBattingTeam,
    outs: 0,
    count: { balls: 0, strikes: 0 },
    bases: emptyBases(),
  };
}

function completePlateAppearance(game: GameState) {
  return {
    ...game,
    count: {
      balls: 0,
      strikes: 0,
    },
    batterIndex: {
      ...game.batterIndex,
      [game.battingTeam]: game.batterIndex[game.battingTeam] + 1,
    },
  };
}

function buildLogEntry(
  before: GameState,
  after: GameState,
  batter: Player,
  pitcher: Player,
  pitch: string,
  result: PitchResult,
): PitchLogEntry {
  return {
    id: `pitch-${before.pitchNumber + 1}`,
    inning: `${before.half} ${before.inning}`,
    pitcher: pitcher.name,
    batter: batter.name,
    pitch,
    result,
    count: `${after.count.balls}-${after.count.strikes}`,
    score: `${after.score.away}-${after.score.home}`,
  };
}

function replacementPlayer(teamId: string): Player {
  return {
    id: `${teamId}-replacement`,
    name: 'Replacement Player',
    position: 'P',
    contact: 50,
    power: 50,
    speed: 50,
    command: 50,
  };
}

function emptyBases(): BaseState {
  return {
    first: null,
    second: null,
    third: null,
  };
}

function clampRating(value: number) {
  return Math.max(20, Math.min(99, Math.round(value)));
}
