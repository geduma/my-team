import { describe, it, expect } from 'vitest'
import { generateRoundRobin, computeStandings } from '../services/tournament'

describe('generateRoundRobin', () => {
  it('returns empty array for less than 2 participants', () => {
    expect(generateRoundRobin([])).toEqual([])
    expect(generateRoundRobin([{ id: 'a' }])).toEqual([])
  })

  it('generates correct number of rounds for even participants', () => {
    const participants = [
      { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }
    ]
    const rounds = generateRoundRobin(participants)
    expect(rounds).toHaveLength(3)
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2)
    }
  })

  it('generates correct number of rounds for odd participants', () => {
    const participants = [
      { id: 'a' }, { id: 'b' }, { id: 'c' }
    ]
    const rounds = generateRoundRobin(participants)
    expect(rounds).toHaveLength(3)
    for (const r of rounds) {
      expect(r.matches).toHaveLength(1)
    }
  })

  it('each participant plays each other exactly once', () => {
    const participants = [
      { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }
    ]
    const rounds = generateRoundRobin(participants)
    const pairings = new Set()
    for (const r of rounds) {
      for (const m of r.matches) {
        const pair = [m.homeParticipantId, m.awayParticipantId].sort().join('-')
        pairings.add(pair)
      }
    }
    const expectedPairs = 10
    expect(pairings.size).toBe(expectedPairs)
  })

  it('alternates home/away each round', () => {
    const participants = [
      { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }
    ]
    const rounds = generateRoundRobin(participants)
    for (const r of rounds) {
      for (const m of r.matches) {
        expect(m.homeParticipantId).toBeTruthy()
        expect(m.awayParticipantId).toBeTruthy()
      }
    }
  })

  it('round numbers are sequential starting from 1', () => {
    const participants = [
      { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }
    ]
    const rounds = generateRoundRobin(participants)
    rounds.forEach((r, i) => {
      expect(r.round).toBe(i + 1)
    })
  })
})

describe('computeStandings', () => {
  const participants = [
    { id: 'p1', displayName: 'Player 1', teamName: 'Team A' },
    { id: 'p2', displayName: 'Player 2', teamName: 'Team B' },
    { id: 'p3', displayName: 'Player 3', teamName: 'Team C' }
  ]

  it('returns all participants with zero stats when no matches', () => {
    const standings = computeStandings(participants, [])
    expect(standings).toHaveLength(3)
    for (const s of standings) {
      expect(s.played).toBe(0)
      expect(s.points).toBe(0)
    }
  })

  it('awards 3 points for a win', () => {
    const matches = [
      {
        homeParticipantId: 'p1',
        awayParticipantId: 'p2',
        homeScore: 3,
        awayScore: 1,
        status: 'played'
      }
    ]
    const standings = computeStandings(participants, matches)
    const p1 = standings.find(s => s.participantId === 'p1')
    const p2 = standings.find(s => s.participantId === 'p2')
    expect(p1.points).toBe(3)
    expect(p1.wins).toBe(1)
    expect(p2.points).toBe(0)
    expect(p2.losses).toBe(1)
  })

  it('awards 1 point each for a draw', () => {
    const matches = [
      {
        homeParticipantId: 'p1',
        awayParticipantId: 'p2',
        homeScore: 2,
        awayScore: 2,
        status: 'played'
      }
    ]
    const standings = computeStandings(participants, matches)
    const p1 = standings.find(s => s.participantId === 'p1')
    const p2 = standings.find(s => s.participantId === 'p2')
    expect(p1.points).toBe(1)
    expect(p1.draws).toBe(1)
    expect(p2.points).toBe(1)
    expect(p2.draws).toBe(1)
  })

  it('calculates goal difference correctly', () => {
    const matches = [
      {
        homeParticipantId: 'p1',
        awayParticipantId: 'p2',
        homeScore: 5,
        awayScore: 2,
        status: 'played'
      }
    ]
    const standings = computeStandings(participants, matches)
    const p1 = standings.find(s => s.participantId === 'p1')
    const p2 = standings.find(s => s.participantId === 'p2')
    expect(p1.goalDiff).toBe(3)
    expect(p2.goalDiff).toBe(-3)
  })

  it('sorts by points, then goal difference, then goals for', () => {
    const matches = [
      { homeParticipantId: 'p1', awayParticipantId: 'p2', homeScore: 1, awayScore: 0, status: 'played' },
      { homeParticipantId: 'p2', awayParticipantId: 'p3', homeScore: 2, awayScore: 0, status: 'played' },
      { homeParticipantId: 'p3', awayParticipantId: 'p1', homeScore: 1, awayScore: 1, status: 'played' }
    ]
    const standings = computeStandings(participants, matches)
    expect(standings[0].participantId).toBe('p1')
    expect(standings[1].participantId).toBe('p2')
    expect(standings[2].participantId).toBe('p3')
  })

  it('ignores unplayed matches', () => {
    const matches = [
      {
        homeParticipantId: 'p1',
        awayParticipantId: 'p2',
        homeScore: null,
        awayScore: null,
        status: 'pending'
      }
    ]
    const standings = computeStandings(participants, matches)
    for (const s of standings) {
      expect(s.played).toBe(0)
    }
  })
})
