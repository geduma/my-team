/* global google */

import { setCurrentUser, clearCurrentUser } from './db'

const SUPERUSER_GID = '111381241389439493988'

let authInited = false
let callbackQueue = []

function handleCredentialResponse (response) {
  const data = parseJwt(response.credential)
  const isSuperuser = data.sub === SUPERUSER_GID
  const user = {
    googleId: data.sub,
    displayName: data.name,
    email: data.email,
    photoURL: `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.sub}`,
    isSuperuser
  }
  setCurrentUser(user).then(() => {
    callbackQueue.forEach(fn => fn(user))
    callbackQueue = []
  })
}

function parseJwt (token) {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
  return JSON.parse(jsonPayload)
}

export function initAuth () {
  if (authInited) return Promise.resolve()
  return new Promise((resolve) => {
    const check = () => {
      if (window.google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse
        })
        authInited = true
        resolve()
      } else {
        setTimeout(check, 200)
      }
    }
    check()
  })
}

export function renderSignInButton (element) {
  initAuth().then(() => {
    google.accounts.id.renderButton(element, {
      type: 'standard',
      shape: 'rectangular',
      theme: 'outline',
      text: 'signin_with',
      size: 'large',
      width: element.offsetWidth || 280
    })
  })
}

export function onSignIn (fn) {
  callbackQueue.push(fn)
}

export async function signOut () {
  await clearCurrentUser()
}
