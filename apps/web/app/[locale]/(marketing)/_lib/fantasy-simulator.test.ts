import { describe, expect, it } from 'vitest';

import {
  createGame,
  getTeamAverage,
  resolveTrade,
  simulatePitch,
  type Player,
  type Team,
} from './fantasy-simulator';

const lions: Team = {
  id: 'lions',
  name: 'Ledger Lions',
  color: '#185abd',
  roster: [
    {
      id: 'ada',
      name: 'Ada Soto',
      position: 'SS',
      contact: 90,
      power: 75,
      speed: 82,
      command: 45,
    },
    {
      id: 'mira',
      name: 'Mira Cole',
      position: 'P',
      contact: 40,
      power: 38,
      speed: 42,
      command: 88,
    },
  ],
};

const pilots: Team = {
  id: 'pilots',
  name: 'Pivot Pilots',
  color: '#217346',
  roster: [
    {
      id: 'niko',
      name: 'Niko Fox',
      position: 'CF',
      contact: 78,
      power: 62,
      speed: 91,
      command: 44,
    },
    {
      id: 'june',
      name: 'June Park',
      position: 'P',
      contact: 35,
      power: 35,
      speed: 46,
      command: 82,
    },
  ],
};

describe('fantasy simulator', () => {
  it('calculates a rounded roster average from player tools', () => {
    expect(getTeamAverage(lions)).toBe(63);
  });

  it('swaps traded players between teams', () => {
    const [updatedLions, updatedPilots] = resolveTrade(
      lions,
      pilots,
      'ada',
      'niko',
    );

    expect(updatedLions.roster.map((player) => player.id)).toContain('niko');
    expect(updatedPilots.roster.map((player) => player.id)).toContain('ada');
  });

  it('advances a pitch-level game state', () => {
    const game = createGame(lions, pilots);
    const next = simulatePitch(game, () => 0.01);

    expect(next.count.balls).toBe(1);
    expect(next.log[0]?.result).toBe('Ball');
  });

  it('scores a run and clears the batter on a home run', () => {
    const game = createGame(lions, pilots);
    const batter: Player = {
      id: 'slugger',
      name: 'Doc Homer',
      position: '1B',
      contact: 99,
      power: 99,
      speed: 55,
      command: 30,
    };

    const next = simulatePitch(
      {
        ...game,
        battingTeam: 'away',
        away: { ...game.away, roster: [batter] },
      },
      () => 0.995,
    );

    expect(next.score.away).toBe(1);
    expect(next.count).toEqual({ balls: 0, strikes: 0 });
    expect(next.log[0]?.result).toBe('Home Run');
  });
});
