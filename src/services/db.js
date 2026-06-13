const DB_NAME = 'myteam-db'
const DB_VERSION = 1

function openDB () {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('currentUser')) {
        db.createObjectStore('currentUser', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function generateHash () {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function getAllEvents () {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly')
    const store = tx.objectStore('events')
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getEvent (id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly')
    const store = tx.objectStore('events')
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function getEventByHash (hash) {
  const events = await getAllEvents()
  return events.find(e => e.hash === hash) || null
}

export async function saveEvent (event) {
  const db = await openDB()
  const data = {
    ...event,
    hash: event.hash || generateHash(),
    updatedAt: new Date().toISOString()
  }
  if (!data.id) {
    data.id = crypto.randomUUID()
    data.createdAt = data.updatedAt
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite')
    const store = tx.objectStore('events')
    const request = store.put(data)
    request.onsuccess = () => resolve(data)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteEvent (id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite')
    const store = tx.objectStore('events')
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getCurrentUser () {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('currentUser', 'readonly')
    const store = tx.objectStore('currentUser')
    const request = store.get('user')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function setCurrentUser (user) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('currentUser', 'readwrite')
    const store = tx.objectStore('currentUser')
    const request = store.put({ id: 'user', ...user })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearCurrentUser () {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('currentUser', 'readwrite')
    const store = tx.objectStore('currentUser')
    const request = store.delete('user')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
