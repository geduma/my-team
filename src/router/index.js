import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.view.vue'
import Join from '../components/Join.view.vue'
import Match from '../components/Match.view.vue'
import Create from '../components/Create.view.vue'
import Events from '../components/Events.view.vue'
import Tournament from '../components/Tournament.view.vue'
import AuthCallback from '../components/AuthCallback.view.vue'
import { getCurrentUser } from '../services/db'
import { isGoogleUser } from '../services/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/create',
      name: 'create',
      component: Create,
      meta: { requiresAuth: true }
    },
    {
      path: '/join/:hash',
      name: 'join',
      component: Join
    },
    {
      path: '/match/:id',
      name: 'match',
      component: Match
    },
    {
      path: '/preview/match/:id',
      name: 'match-preview',
      component: Match,
      meta: { preview: true }
    },
    {
      path: '/tournament',
      name: 'tournament',
      component: Tournament,
      meta: { requiresAuth: true }
    },
    {
      path: '/tournament/:id',
      name: 'tournament-id',
      component: Tournament
    },
    {
      path: '/preview/tournament/:id',
      name: 'tournament-preview',
      component: Tournament,
      meta: { preview: true }
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallback
    },
    {
      path: '/events',
      name: 'events',
      component: Events
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const user = await getCurrentUser()
    if (!user || !isGoogleUser(user)) {
      next({ name: 'home', query: { login: 'true', redirect: to.fullPath } })
      return
    }
  }
  next()
})

export default router
