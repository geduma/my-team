import { supabase } from './supabase'

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

function toSnake (event) {
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
