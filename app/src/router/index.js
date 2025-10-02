import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.view.vue'
import Join from '../components/Join.view.vue'
import Match from '../components/Match.view.vue'
import Create from '../components/Create.view.vue'

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
      component: Create
    },
    {
      path: '/join',
      name: 'join',
      component: Join
    },
    {
      path: '/match',
      name: 'match',
      component: Match
    }
  ]
})

export default router
