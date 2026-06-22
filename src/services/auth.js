import { setCurrentUser, getCurrentUser, clearCurrentUser } from './db'

const SUPERUSER_GID = '111381241389439493988'
const API_BASE = 'https://api.geduma.com'
const APP_ID = import.meta.env.VITE_APP_ID

let callbackQueue = []

export function isGoogleUser (user) {
  return user && user.provider === 'google'
}

function generateGuestId () {
  const existing = localStorage.getItem('myteam-guest-id')
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem('myteam-guest-id', id)
  return id
}

export async function createGuestUser () {
  const existing = await getCurrentUser()
  if (existing) return existing

  const googleId = generateGuestId()
  const guestUser = {
    googleId,
    displayName: null,
    email: null,
    photoURL: `https://api.dicebear.com/9.x/avataaars/svg?seed=${googleId}`,
    isSuperuser: false,
    provider: 'guest'
  }
  await setCurrentUser(guestUser)
  return guestUser
}

export async function setGuestDisplayName (name) {
  const user = await getCurrentUser()
  if (user && user.provider === 'guest') {
    user.displayName = name
    await setCurrentUser(user)
  }
}

export async function login (providerId, redirectTo) {
  const redirect = redirectTo || (window.location.search.includes('redirect=')
    ? new URLSearchParams(window.location.search).get('redirect')
    : '/create')
  sessionStorage.setItem('redirect', redirect)

  const res = await fetch(`${API_BASE}/auth/login/${APP_ID}/${providerId}`, {
    method: 'POST'
  })
  const json = await res.json()
  if (json.ok && json.data?.redirect) {
    window.location.href = json.data.redirect
  } else {
    throw new Error(json.msg || 'Login failed')
  }
}

export async function processCallback (sessionToken) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  const res = await fetch(`${API_BASE}/auth/session/${sessionToken}`, {
    signal: controller.signal
  })
  clearTimeout(timeout)
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Session error')
  return json.data
}

export function buildUser (sessionData) {
  const rawData = sessionData.rawData || {}
  const isSuperuser = rawData.id === SUPERUSER_GID
  return {
    googleId: rawData.id || rawData.sub || sessionData.email,
    displayName: sessionData.displayName,
    email: sessionData.email,
    photoURL: `https://api.dicebear.com/9.x/avataaars/svg?seed=${sessionData.email}`,
    isSuperuser,
    provider: sessionData.provider,
    rawData
  }
}

export function onSignIn (fn) {
  callbackQueue.push(fn)
}

export function notifySignIn (user) {
  callbackQueue.forEach(fn => fn(user))
  callbackQueue = []
}

export async function saveUserAndNotify (user) {
  await setCurrentUser(user)
  notifySignIn(user)
}

export async function signOut () {
  await clearCurrentUser()
}
