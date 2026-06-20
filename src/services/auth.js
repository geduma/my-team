import { setCurrentUser, clearCurrentUser } from './db'

const SUPERUSER_GID = '111381241389439493988'
const API_BASE = 'https://api.geduma.com'
const APP_ID = import.meta.env.VITE_APP_ID

let callbackQueue = []

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
