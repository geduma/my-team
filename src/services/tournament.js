export function generateRoundRobin (participants) {
  const list = participants.map(p => p.id)
  if (list.length < 2) return []

  const fixed = [...list]
  let bye = null

  if (fixed.length % 2 !== 0) {
    bye = 'bye'
    fixed.push(bye)
  }

  const n = fixed.length
  const rounds = []

  for (let r = 0; r < n - 1; r++) {
    const matches = []

    for (let i = 0; i < n / 2; i++) {
      const home = fixed[i]
      const away = fixed[n - 1 - i]

      if (home === bye || away === bye) continue

      // alternate home/away each round
      if (r % 2 === 0) {
        matches.push({ homeParticipantId: home, awayParticipantId: away })
      } else {
        matches.push({ homeParticipantId: away, awayParticipantId: home })
      }
    }

    rounds.push({ round: r + 1, matches })

    // rotate: keep first element fixed, rotate rest clockwise
    const last = fixed[fixed.length - 1]
    for (let i = fixed.length - 1; i > 1; i--) {
      fixed[i] = fixed[i - 1]
    }
    fixed[1] = last
  }

  return rounds
}

export function computeStandings (participants, matches) {
  const map = {}

  for (const p of participants) {
    map[p.id] = {
      participantId: p.id,
      displayName: p.displayName,
      teamName: p.teamName,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0
    }
  }

  for (const m of matches) {
    if (m.status !== 'played' || m.homeScore == null || m.awayScore == null) continue

    const home = map[m.homeParticipantId]
    const away = map[m.awayParticipantId]
    if (!home || !away) continue

    home.played++
    away.played++

    home.goalsFor += m.homeScore
    home.goalsAgainst += m.awayScore
    away.goalsFor += m.awayScore
    away.goalsAgainst += m.homeScore

    if (m.homeScore > m.awayScore) {
      home.wins++
      home.points += 3
      away.losses++
    } else if (m.homeScore < m.awayScore) {
      away.wins++
      away.points += 3
      home.losses++
    } else {
      home.draws++
      home.points += 1
      away.draws++
      away.points += 1
    }
  }

  return Object.values(map)
    .map(s => ({ ...s, goalDiff: s.goalsFor - s.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
}
