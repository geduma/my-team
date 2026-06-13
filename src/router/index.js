import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.view.vue'
import Join from '../components/Join.view.vue'
import Match from '../components/Match.view.vue'
import Create from '../components/Create.view.vue'
import { getCurrentUser } from '../services/db'

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
      component: Join,
      meta: { requiresAuth: true }
    },
    {
      path: '/match/:id',
      name: 'match',
      component: Match,
      meta: { requiresAuth: true }
    },
    {
      path: '/tournament',
      name: 'tournament',
      component: Match,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const user = await getCurrentUser()
    if (!user) {
      next({ name: 'home', query: { login: 'true', redirect: to.fullPath } })
      return
    }
  }
  next()
})

export default router
