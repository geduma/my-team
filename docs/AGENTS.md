# MyTeam — AGENTS.md

## Stack
- **Framework:** Vue 3 (Composition API, `<script setup>`)
- **Build:** Vite 7
- **Routing:** Vue Router 4 (history mode)
- **Styling:** Tailwind CSS 3
- **Auth:** Geduma Auth API (OAuth centralizado) + Guest mode (UUID local) — 3 endpoints HTTP, sin CDN ni npm package
- **Storage:** Supabase (PostgreSQL) para eventos y jugadores
- **Session:** IndexedDB solo para `currentUser`
- **Avatars:** DiceBear HTTP API
- **Linting:** StandardJS (`standard`)
- **Node:** v18.18.0 (`.nvmrc`)
- **Deploy:** Azure Static Web Apps

## Commands
```bash
npm run dev      # servidor de desarrollo Vite
npm run build    # build producción
npm run preview  # preview del build
npm run test     # ejecutar tests (vitest run)
npm run test:watch # tests en modo watch
npx standard     # lint con StandardJS
```

## Conventions

### Code style
- **Sin comentarios** en código de producción
- Nombres en inglés (variables, funciones, componentes, archivos)
- UI/textos visibles al usuario en inglés
- `<script setup>` + Composition API siempre
- Componentes en PascalCase: `Home.view.vue`, `Create.view.vue`
- Views sufijo `.view.vue`
- Archivos planos (no carpetas por componente a menos que haya subcomponentes)

### Vue / Router
- `vue-router` con `createWebHistory`
- Alias `@` para `src/`
- `RouterLink` en lugar de `<a>` para navegación interna
- CSS scoped en componentes

### Tailwind
- Utility classes sobre CSS personalizado
- Colores del branding:
  - Rojo MyTeam: `#e34040`
  - Verde MyTeam: `#64e34f`
  - Azul acción: `#0b88de`
  - Texto claro: `#dedcdc`
- El archivo `main.css` tiene estilos globales (video background, overlay, footer)
- NO modificar estilos globales a menos que sea necesario

### Supabase
- Cliente en `src/services/supabase.js`
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Tabla `events` con snake_case columns (owner_id, max_players, created_at, updated_at)
- Tabla `players` con FK a `events(id)`, on delete cascade. Columna `team` (`'team1'`, `'team2'` o `null`)
- Tablas de torneo: `tournaments`, `tournament_participants`, `tournament_matches`
- RLS activado con policies públicas (select/insert/update/delete para todos)
- Mapeo camelCase ↔ snake_case en `src/services/db.js` mediante `mapEvent()` y `toSnake()`
- Los componentes reciben objetos en camelCase con array `players` embebido

### Persistencia
- **Supabase:** eventos (`events`) y jugadores (`players`)
- **IndexedDB:** solo sesión del usuario (`currentUser` en DB `myteam-user`)
- **localStorage:** `myteam-guest-id` como backup del UUID guest (si se pierde IndexedDB)
- Helper functions en `src/services/db.js`

### Auth (híbrido guest + Google OAuth)
- **Guest mode:** al primer acceso sin usuario, `createGuestUser()` genera un UUID, lo persiste en IndexedDB (`currentUser`) y en localStorage (`myteam-guest-id` como backup). `provider: 'guest'`.
- **Google OAuth:** solo requerido para crear eventos y torneos. Usa Geduma Auth API.
- Funciones en `src/services/auth.js`:
  - `isGoogleUser(user)` → true si `user.provider === 'google'`
  - `createGuestUser()` → genera/recupera UUID guest, lo guarda en IndexedDB
  - `setGuestDisplayName(name)` → actualiza `displayName` del guest en IndexedDB
  - `login(providerId)` → inicia OAuth (Google)
  - `processCallback(sessionToken)` → canjea token por datos de sesión
- API base hardcodeada: `API_BASE = 'https://api.geduma.com'`
- App ID vía `VITE_APP_ID` en `.env`
- Flujo Google: `login('prov_google')` → POST `/auth/login/{appId}/{providerId}` → redirect → callback (lee `session_token` del **fragment** de la URL, no del query string) → GET `/auth/session/{sessionToken}` → guardar usuario en IndexedDB → se ignora el guest previo
- Avatar DiceBear: seed = email (Google) o UUID (guest)
- Superuser detectado por Google ID hardcodeado (`SUPERUSER_GID`)

### Variables de entorno
- Archivo `.env` en la raíz (no commiteado)
- Prefijo `VITE_` para que Vite las exponga al frontend
- Ejemplo:
  ```
  VITE_APP_ID=app_xxxxxx
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```
- `VITE_GEDUMA_API_URL` no va en `.env`: es constante hardcodeada en `src/services/auth.js`

### Rutas
| Ruta | Componente | Auth requerida |
|------|-----------|:---:|
| `/` | Home.view | No |
| `/create` | Create.view | Sí |
| `/join/:hash` | Join.view | No* |
| `/match/:id` | Match.view | No* |
| `/tournament` | Tournament.view | Sí |
| `/tournament/:id` | Tournament.view | No* |
| `/preview/match/:id` | Match.view | No (preview) |
| `/preview/tournament/:id` | Tournament.view | No (preview) |
| `/auth/callback` | AuthCallback.view | No |
| `/events` | Events.view | No |

_* Si no hay usuario en IndexedDB, se crea guest automáticamente (UUID)._

### Navegación protegida
- `router.beforeEach` verifica `currentUser` en IndexedDB + `isGoogleUser()` en `auth.js`
- Si la ruta requiere auth (`requiresAuth: true`) y el usuario no es Google-authenticated, guardar destino en query param `redirect` y redirige a Home con `?login=true`
- `/join/:hash`, `/match/:id`, `/tournament/:id` ya no requieren auth — cualquiera puede acceder
- Home detecta `?login=true` y ejecuta `login('prov_google')`, que persiste el `redirect` en `sessionStorage` y redirige al provider OAuth
- Tras el callback, `AuthCallback.view.vue` lee el `session_token` del **fragment** (`#session_token=...`) de la URL, procesa el token, guarda el usuario en IndexedDB (reemplazando al guest) y redirige al destino guardado

### Estructura de archivos
```
src/
├── App.vue
├── main.js
├── assets/
│   └── main.css
├── components/
│   ├── Home.view.vue
│   ├── Create.view.vue
│   ├── Join.view.vue
│   ├── Match.view.vue
│   ├── Tournament.view.vue
│   ├── AuthCallback.view.vue
│   └── Events.view.vue
├── router/
│   └── index.js
└── services/
    ├── auth.js        # Geduma Auth API + Guest mode
    ├── db.js           # Supabase + IndexedDB (session)
    ├── supabase.js     # Supabase client
    └── tournament.js   # Round-robin algorithm
```

## Reglas para AI Agents
1. NO agregar dependencias npm sin aprobación explícita
2. NO usar librerías de UI (Vuetify, PrimeVue, etc.) — solo Tailwind
3. NO usar Vuex/Pinia a menos que sea estrictamente necesario (preferir provide/inject o props)
4. NO modificar `index.html` a menos que sea necesario
5. NO renombrar vistas ni rutas sin actualizar el router
6. Mantener todos los componentes en `src/components/` a menos que haya más de 3 subcomponentes
7. Los archivos de servicio van en `src/services/`
8. NO subir secretos/tokens al repo
9. Los estilos globales solo en `main.css` — no en `App.vue`
10. Los video/background MP4 se sirven desde `public/`
11. Variables de entorno con prefijo `VITE_`, archivo `.env` en raíz, ignorado por git. `VITE_GEDUMA_API_URL` no se usa (constante hardcodeada en `auth.js`)
12. Las migraciones SQL de Supabase van en `supabase-migration.sql` en la raíz
13. No modificar RLS policies sin verificar el impacto en la seguridad

## Branding
- Título: **MyTeam** (rojo `#e34040`, verde `#64e34f`)
- Tagline: "The Ultimate Soccer Organizer"
- Footer: "by @geduma ☕"
