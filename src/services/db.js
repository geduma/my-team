import { supabase } from './supabase'

export const EXPIRATION_DAYS = 15

export function isEventExpired (event) {
  if (!event || !event.createdAt) return false
  const created = new Date(event.createdAt).getTime()
  return Date.now() - created > EXPIRATION_DAYS * 24 * 60 * 60 * 1000
}

function generateHash () {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function mapEvent (row) {
  const { data: playerRows } = await supabase
    .from('players')
    .select('*')
    .eq('event_id', row.id)

  return {
    id: row.id,
    hash: row.hash,
    ownerId: row.owner_id,
    title: row.title,
    date: row.date,
    time: row.time,
    location: row.location,
    type: row.type,
    maxPlayers: row.max_players,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    players: (playerRows || []).map(p => ({
      id: p.user_id,
      displayName: p.display_name,
      photoURL: p.photo_url,
      team: p.team
    }))
  }
}

export function toSnake (event) {
  return {
    id: event.id,
    hash: event.hash,
    owner_id: event.ownerId,
    title: event.title,
    date: event.date,
    time: event.time,
    location: event.location,
    type: event.type || 'match',
    max_players: event.maxPlayers ?? 22,
    description: event.description || null,
    updated_at: new Date().toISOString()
  }
}

export async function getAllEvents () {
  const { data: rows, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return Promise.all((rows || []).map(mapEvent))
}

export async function getEvent (id) {
  const { data: row, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!row) return null
  return mapEvent(row)
}

export async function getEventByHash (hash) {
  const { data: row, error } = await supabase
    .from('events')
    .select('*')
    .eq('hash', hash)
    .maybeSingle()

  if (error) throw error
  if (!row) return null
  return mapEvent(row)
}

export async function saveEvent (event) {
  const now = new Date().toISOString()
  const data = {
    ...event,
    hash: event.hash || generateHash(),
    updatedAt: now
  }
  if (!data.id) {
    data.id = crypto.randomUUID()
    data.createdAt = now
  }

  const { players, ...eventFields } = data
  const snake = toSnake(eventFields)

  const { data: savedRow, error } = await supabase
    .from('events')
    .upsert(snake)
    .select()
    .single()

  if (error) throw error

  if (players) {
    const { error: delErr } = await supabase
      .from('players')
      .delete()
      .eq('event_id', savedRow.id)
    if (delErr) throw delErr

    if (players.length) {
      const playerRows = players.map(p => ({
        event_id: savedRow.id,
        user_id: p.id,
        display_name: p.displayName,
        photo_url: p.photoURL || null,
        team: p.team || null
      }))
      const { error: insErr } = await supabase
        .from('players')
        .insert(playerRows)
      if (insErr) throw insErr
    }
  }

  return {
    id: savedRow.id,
    hash: savedRow.hash,
    ownerId: savedRow.owner_id,
    title: savedRow.title,
    date: savedRow.date,
    time: savedRow.time,
    location: savedRow.location,
    type: savedRow.type,
    maxPlayers: savedRow.max_players,
    description: savedRow.description,
    createdAt: savedRow.created_at,
    updatedAt: savedRow.updated_at,
    players: players || []
  }
}

export async function deleteEvent (id) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function renewEvent (id) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('events')
    .update({ created_at: now, updated_at: now })
    .eq('id', id)
  if (error) throw error
}

export async function setPlayerTeam (eventId, userId, team) {
  const { error } = await supabase
    .from('players')
    .update({ team })
    .eq('event_id', eventId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removePlayerFromEvent (eventId, userId) {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function shuffleTeams (eventId) {
  const { data: rows, error: fetchErr } = await supabase
    .from('players')
    .select('user_id')
    .eq('event_id', eventId)

  if (fetchErr) throw fetchErr
  if (!rows || !rows.length) return

  const shuffled = [...rows]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const half = Math.ceil(shuffled.length / 2)
  const team1Ids = shuffled.slice(0, half).map(r => r.user_id)
  const team2Ids = shuffled.slice(half).map(r => r.user_id)

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from('players').update({ team: 'team1' }).eq('event_id', eventId).in('user_id', team1Ids),
    supabase.from('players').update({ team: 'team2' }).eq('event_id', eventId).in('user_id', team2Ids)
  ])

  if (err1) throw err1
  if (err2) throw err2
}

// Tournament functions

async function mapTournament (row) {
  const { data: participantRows } = await supabase
    .from('tournament_participants')
    .select('*')
    .eq('tournament_id', row.id)
    .order('created_at')

  const { data: matchRows } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', row.id)
    .order('round')

  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    participants: (participantRows || []).map(p => ({
      id: p.id,
      displayName: p.display_name,
      teamName: p.team_name,
      userId: p.user_id
    })),
    matches: (matchRows || []).map(m => ({
      id: m.id,
      round: m.round,
      homeParticipantId: m.home_participant_id,
      awayParticipantId: m.away_participant_id,
      homeScore: m.home_score,
      awayScore: m.away_score,
      status: m.status,
      details: m.details
    }))
  }
}

export async function createTournament (data) {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  const { error } = await supabase
    .from('tournaments')
    .insert({
      id,
      owner_id: data.ownerId,
      title: data.title,
      description: data.description || null,
      updated_at: now
    })

  if (error) throw error

  return { id, ownerId: data.ownerId, title: data.title, description: data.description, createdAt: now, updatedAt: now, participants: [], matches: [] }
}

export async function updateTournament (id, fields) {
  const { error } = await supabase
    .from('tournaments')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function addParticipant (tournamentId, participant) {
  const { data: row, error } = await supabase
    .from('tournament_participants')
    .insert({
      tournament_id: tournamentId,
      display_name: participant.displayName,
      team_name: participant.teamName,
      user_id: participant.userId || null
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: row.id,
    displayName: row.display_name,
    teamName: row.team_name,
    userId: row.user_id
  }
}

export async function removeParticipant (id) {
  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function setTournamentMatches (tournamentId, rounds) {
  const { error: delErr } = await supabase
    .from('tournament_matches')
    .delete()
    .eq('tournament_id', tournamentId)

  if (delErr) throw delErr

  const rows = []
  for (const r of rounds) {
    for (const m of r.matches) {
      rows.push({
        tournament_id: tournamentId,
        round: r.round,
        home_participant_id: m.homeParticipantId,
        away_participant_id: m.awayParticipantId,
        status: 'pending'
      })
    }
  }

  if (rows.length) {
    const { error: insErr } = await supabase
      .from('tournament_matches')
      .insert(rows)
    if (insErr) throw insErr
  }
}

export async function updateMatchScore (matchId, homeScore, awayScore) {
  const { error } = await supabase
    .from('tournament_matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'played'
    })
    .eq('id', matchId)

  if (error) throw error
}

export async function getTournament (id) {
  const { data: row, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!row) return null
  return mapTournament(row)
}

export async function getAllTournaments () {
  const { data: rows, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return Promise.all((rows || []).map(mapTournament))
}

export async function deleteTournament (id) {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function renewTournament (id) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('tournaments')
    .update({ created_at: now, updated_at: now })
    .eq('id', id)
  if (error) throw error
}

export async function getCurrentUser () {
  const db = await openUserDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('currentUser', 'readonly')
    const store = tx.objectStore('currentUser')
    const request = store.get('user')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function setCurrentUser (user) {
  const db = await openUserDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('currentUser', 'readwrite')
    const store = tx.objectStore('currentUser')
    const storedUser = { ...user, id: 'user' }
    const request = store.put(storedUser)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearCurrentUser () {
  const db = await openUserDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('currentUser', 'readwrite')
    const store = tx.objectStore('currentUser')
    const request = store.delete('user')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function openUserDB () {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myteam-user', 1)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('currentUser')) {
        db.createObjectStore('currentUser', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
