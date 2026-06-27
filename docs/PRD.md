# PRD: MyTeam — The Ultimate Soccer Organizer

## 1. Resumen del Producto
Aplicación web para organizar partidos de fútbol con amigos. Permite crear eventos, compartir enlaces de invitación, gestionar jugadores y asignar equipos de forma aleatoria.

## 2. Objetivos
- Facilitar la organización de partidos de fútbol informales
- Eliminar la fricción de coordinar horarios, jugadores y equipos
- Mantener cero costo operativo sin backend propio

## 3. Users Personas

| Persona | Descripción |
|---------|-------------|
| **Organizador** | Crea el evento, comparte el link, edita detalles, reasigna equipos |
| **Jugador** | Recibe el link, confirma asistencia, ve su equipo asignado |

## 4. Funcionalidades

### MVP (Fase 1)

| # | Funcionalidad | Descripción |
|--:|--------------|-------------|
| F1 | **Modo invitado + Google Auth** | Modo guest automático (UUID + name) para unirse a eventos. Login con Google vía Geduma Auth API para crear eventos y torneos. |
| F2 | **Crear evento** | Formulario para crear un partido: nombre, fecha, hora, lugar, descripción opcional. Solo usuarios con Google. |
| F3 | **Hash único de invitación** | Al crear el evento se genera un hash único. El organizador comparte la URL: `/join/:hash` |
| F4 | **Unirse a evento** | Al abrir el enlace, el jugador ve los detalles del evento. Si es guest, ingresa su nombre (obligatorio, único por evento). Si es Google user, confirma directamente. |
| F5 | **Vista del evento (Match)** | Vista con detalles del evento. El organizador tiene botones "Edit" y "Delete". Los invitados (guest o Google) ven solo lectura con opción "Join match" si no se han unido. |
| F6 | **Persistencia compartida** | Los datos se guardan en Supabase (PostgreSQL). Todos los usuarios ven los mismos eventos en tiempo real. |
| F7 | **Asignación aleatoria de equipos** | Botón "Shuffle" que divide los jugadores confirmados en 2 equipos balanceados aleatoriamente. |
| F8 | **Cancha visual** | Diagrama de cancha con posiciones de jugadores (11 vs 11 o según número de jugadores). |
| F9 | **Edición manual de equipos** | El organizador puede hacer clic en un jugador para moverlo al otro equipo. |
| F10 | **Torneo round-robin** | Creación y gestión de torneos con sistema round-robin, tabla de posiciones (3-1-0), y generación de partidos. |
| F11 | **Preview público** | Rutas `/preview/match/:id` y `/preview/tournament/:id` sin autenticación, ocultando todos los elementos interactivos (Edit, Delete, Join, Shuffle, Remove, score modal, etc.). Badge "Preview" visible en el header. |

### Fase 2 (futuro)

## 5. Requerimientos No Funcionales

| # | Requisito |
|---|-----------|
| R1 | Zero dependencias de pago (Supabase free tier) |
| R2 | Mínimo de dependencias de terceros |
| R3 | Desplegable en Azure Static Web Apps |
| R4 | Backend serverless via Supabase (PostgreSQL + API) |
| R5 | UI en inglés, código en inglés |
| R6 | Diseño responsive (mobile-first) |
| R7 | App ID (Geduma Auth) y Supabase credentials configurables via `.env` |

## 6. Arquitectura Técnica

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3 (Composition API) + Vite |
| Estilos | Tailwind CSS |
| Ruteo | Vue Router 4 |
| Autenticación | Geduma Auth API (OAuth centralizado) — `src/services/auth.js` |
| Persistencia | Supabase (PostgreSQL) para eventos y jugadores |
| Sesión local | IndexedDB para `currentUser` |
| Avatars | DiceBear HTTP API |
| Algoritmo torneo | src/services/tournament.js (round-robin) |
| Despliegue | Azure Static Web Apps |

### Árbol de rutas

| Ruta | Componente | Auth requerida | Descripción |
|------|-----------|:------------:|-------------|
| `/` | Home.view | No | Landing page con acciones principales |
| `/auth/callback` | AuthCallback.view | No | Callback OAuth — recibe `session_token` vía **fragment** (hash) de la URL y completa login |
| `/create` | Create.view | Google | Formulario para crear nuevo evento |
| `/join/:hash` | Join.view | No* | Unirse a evento por hash (guest: input nombre) |
| `/match/:id` | Match.view | No* | Detalle del evento (guest: unirse, ver info) |
| `/preview/match/:id` | Match.view | No | Preview pública del evento (solo lectura) |
| `/tournament` | Tournament.view | Google | Crear torneo |
| `/tournament/:id` | Tournament.view | No* | Vista de torneo existente (guest: read-only) |
| `/preview/tournament/:id` | Tournament.view | No | Preview pública del torneo (solo lectura) |
| `/events` | Events.view | No | Lista pública de todos los eventos |

_* Guest UUID generado automáticamente y persistido en IndexedDB + localStorage_

### Modelo de datos

#### Supabase — Tabla `events`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | Generado al crear |
| `hash` | `text` UNIQUE | Código corto para invitaciones |
| `owner_id` | `text` | Google ID del creador |
| `title` | `text` | Nombre del partido |
| `date` | `text` | Fecha ISO |
| `time` | `text` | HH:mm |
| `location` | `text` | Lugar |
| `type` | `text` | `'match'` o `'tournament'` |
| `max_players` | `integer` | Total de jugadores |
| `description` | `text` | Opcional |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

#### Supabase — Tabla `players`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | Generado al crear |
| `event_id` | `uuid` FK → events | Evento al que pertenece |
| `user_id` | `text` | Google ID del jugador |
| `display_name` | `text` | Nombre visible |
| `photo_url` | `text` | Avatar DiceBear (seed: email) |
| `team` | `text` | `'team1'`, `'team2'` o `null` |
| UNIQUE | `(event_id, user_id)` | Un jugador por evento |

#### IndexedDB — Store `currentUser` (DB: `myteam-user`)

```js
{
  id: 'user',            // clave fija
  googleId: string,      // Google ID o UUID de guest
  displayName: string,   // null hasta que el guest ingrese su nombre
  email: string,         // null para guest
  photoURL: string       // DiceBear con UUID como seed (guest) o email (Google)
  isSuperuser: boolean,  // Admin check por Google ID hardcodeado
  provider: string,      // 'google' o 'guest'
  rawData: object        // Respuesta cruda del provider (solo Google)
}
```

#### localStorage — `myteam-guest-id` (backup de identidad guest)

```
myteam-guest-id: "uuid-generado-aleatoriamente"
```

Persiste aunque se borre IndexedDB. Si el usuario vuelve a la app, el mismo UUID se reusa.

### Mapeo JS ↔ DB

En `src/services/db.js`:

| JS (camelCase) | DB (snake_case) |
|----------------|-----------------|
| `ownerId` | `owner_id` |
| `maxPlayers` | `max_players` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `displayName` | `display_name` |
| `photoURL` | `photo_url` |

- `mapEvent()` convierte fila SQL → objeto JS con array `players` embebido
- `toSnake()` convierte objeto JS → columnas snake_case
- `setPlayerTeam(eventId, userId, team)` — asigna jugador a equipo
- `shuffleTeams(eventId)` — randomiza equipos en la DB
- Funciones de torneo: `createTournament`, `updateTournament`, `addParticipant`, `removeParticipant`, `setTournamentMatches`, `updateMatchScore`, `getTournament`, `getAllTournaments`, `deleteTournament`

## 7. Flujos principales

### Flujo: Crear evento
1. Usuario abre `/` → hace clic en "Create Match"
2. Si no está autenticado con Google, se redirige a Geduma Auth → Google OAuth → callback → redirige al destino
3. Si es guest, se inicia OAuth automáticamente. Tras login Google, el guest se ignora y se usa la nueva identidad Google.
4. Autenticado con Google → redirige a `/create`
5. Llena formulario (nombre, fecha, hora, lugar)
6. Submit → se guarda en Supabase (`events` + `players`) → se genera hash → redirige a `/match/:id`
7. Se muestra el link de invitación para copiar y compartir

### Flujo: Unirse a evento (guest)
1. Invitado abre `/join/:hash`
2. Si no hay usuario en IndexedDB, se genera automáticamente un UUID guest (respaldado en localStorage)
3. Se cargan los detalles del evento desde Supabase
4. Se muestra input de nombre (obligatorio). Si el guest ya tiene nombre guardado, se prellena.
5. Al hacer clic en "Join", se valida que el nombre no exista ya en el evento (case-insensitive)
6. Si hay duplicado → error, puede cambiar el nombre
7. Si ok → se persiste el nombre en IndexedDB y se agrega a `players`
8. Redirige a `/match/:id`

### Flujo: Unirse a evento (Google user)
1. Usuario autenticado con Google abre `/join/:hash`
2. Se cargan los detalles del evento
3. Botón "Join match" sin input de nombre (usa `displayName` de Google)
4. Se agrega el jugador a la tabla `players`
5. Redirige a `/match/:id`

### Flujo: Ver/editar evento
1. Usuario abre `/match/:id` (o desde `/events` navega a `/preview/match/:id`)
2. Si no hay usuario, se crea guest automáticamente
3. Carga desde Supabase (`events` + `players` relacionado)
4. Vista por defecto: solo lectura para todos (detalles + lista de jugadores)
5. Si es el `ownerId` (Google ID real) → botones "Edit" y "Delete" visibles
6. Guest users: no ven Edit/Delete/Shuffle/Remove (solo se unen y ven info)
7. Edit: formulario editable → Save actualiza en Supabase
8. Delete: confirma → elimina evento de Supabase (cascade a players)
9. Si no está unido → botón "Join match" (guest sin nombre: modal para ingresarlo)
10. Si ya está unido → solo vista

### Flujo: Vista pública de previsualización
1. Usuario (autenticado o no) abre `/preview/match/:id` o `/preview/tournament/:id`
2. Se cargan los detalles desde Supabase sin verificar autenticación
3. Todos los elementos interactivos están ocultos (Edit, Delete, Join, Shuffle, Remove player, Generate matches, score modal)
4. Un badge "Preview" se muestra junto al título
5. El usuario puede ver cancha, lineup, standings, participantes y resultados de partidos, pero no modificar nada
6. Desde `/events` (público) se navega a estas rutas de preview

## 8. Criterios de éxito
- App funcional sin backend propio
- Eventos compartidos entre todos los usuarios (cross-browser)
- Tiempo de carga inicial < 2s
- Sin dependencias de pago (Supabase free tier)
- Invite links funcionales desde cualquier dispositivo/navegador
