# PRD: MyTeam — The Ultimate Soccer Organizer

## 1. Resumen del Producto
Aplicación web para organizar partidos de fútbol con amigos. Permite crear eventos, compartir enlaces de invitación, gestionar jugadores y asignar equipos de forma aleatoria.

## 2. Objetivos
- Facilitar la organización de partidos de fútbol informales
- Eliminar la fricción de coordinar horarios, jugadores y equipos
- Mantener cero costo operativo (sin backend de pago, sin dependencias costosas)

## 3. Users Personas

| Persona | Descripción |
|---------|-------------|
| **Organizador** | Crea el evento, comparte el link, edita detalles, reasigna equipos |
| **Jugador** | Recibe el link, confirma asistencia, ve su equipo asignado |

## 4. Funcionalidades

### MVP (Fase 1)

| # | Funcionalidad | Descripción |
|---|--------------|-------------|
| F1 | **Login con Google** | Autenticación usando Google Identity Services (GIS). Sin registro manual. |
| F2 | **Crear evento** | Formulario para crear un partido: nombre, fecha, hora, lugar, número de jugadores, descripción opcional. |
| F3 | **Hash único de invitación** | Al crear el evento se genera un hash único. El organizador comparte la URL: `/join/:hash` |
| F4 | **Unirse a evento** | Al abrir el enlace, el jugador ve los detalles del evento y confirma su asistencia (autenticado con Google). |
| F5 | **Vista del evento (Match)** | Vista por defecto en solo lectura. El organizador tiene un botón "Editar" que habilita el formulario para modificar detalles. Los invitados ven solo lectura sin botón de edición. |
| F6 | **Persistencia local** | Los datos se guardan en IndexedDB (cliente). Sin backend. Persistencia permanente en el navegador. |

### Fase 2

| # | Funcionalidad | Descripción |
|---|--------------|-------------|
| F7 | **Asignación aleatoria de equipos** | Botón que divide los jugadores confirmados en 2 equipos balanceados aleatoriamente. |
| F8 | **Cancha visual** | Diagrama de cancha con posiciones de jugadores (11 vs 11 o según número de jugadores). |
| F9 | **Edición manual de equipos** | El organizador puede arrastrar jugadores entre equipos y posiciones. |
| F10 | **Torneo** | Brackets de torneo multi-partido (usa la misma vista Match como base). |

## 5. Requerimientos No Funcionales

| # | Requisito |
|---|-----------|
| R1 | Zero dependencias de pago |
| R2 | Mínimo de dependencias de terceros |
| R3 | Desplegable en Azure Static Web Apps |
| R4 | Sin backend en ninguna fase (solo frontend + IndexedDB) |
| R5 | Código en español/inglés (UI en español, código en inglés) |
| R6 | Diseño responsive (mobile-first) |
| R7 | Google Client ID configurable via `VITE_GOOGLE_CLIENT_ID` en `.env` |

## 6. Arquitectura Técnica Propuesta

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3 (Composition API) + Vite |
| Estilos | Tailwind CSS |
| Ruteo | Vue Router 4 |
| Autenticación | Google Identity Services (GIS) — CDN, configurable via `VITE_GOOGLE_CLIENT_ID` |
| Persistencia | IndexedDB nativa (sin wrapper) |
| Despliegue | Azure Static Web Apps |

### Árbol de rutas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | Home.view | Landing page con acciones principales |
| `/create` | Create.view | Formulario para crear nuevo evento |
| `/join/:hash` | Join.view | Unirse a evento por hash de invitación |
| `/match/:id` | Match.view | Detalle/edición del evento |
| `/tournament` | Match.view | Vista de torneo (fase 2) |

### Modelo de datos (MVP — IndexedDB)

```js
// Store: "events"
{
  id: string,            // UUID generado al crear
  hash: string,          // crypto.randomUUID() → base64url → primeros 8 chars
  ownerId: string,       // Google ID del creador
  title: string,         // nombre del partido
  date: string,          // ISO date
  time: string,          // HH:mm
  location: string,      // lugar
  maxPlayers: number,    // total de jugadores (ej: 22)
  description: string,   // opcional
  players: [             // lista de jugadores
    {
      id: string,
      displayName: string,
      photoURL: string,
      team: 1 | 2 | null // null = sin asignar
    }
  ],
  createdAt: string,
  updatedAt: string
}

// Store: "currentUser"
{
  id: string,
  displayName: string,
  email: string,
  photoURL: string
}
```

## 7. Flujos principales

### Flujo: Crear evento
1. Usuario abre `/` → hace clic en "Create Match"
2. Si no está autenticado, se muestra login con Google
3. Autenticado → redirige a `/create`
4. Llena formulario (nombre, fecha, hora, lugar, jugadores)
5. Submit → se guarda en IndexedDB → se genera hash → redirige a `/match/:id`
6. Se muestra el hash/link para copiar y compartir

### Flujo: Unirse a evento
1. Invitado abre `/join/:hash`
2. Si no está autenticado, login con Google
3. Autenticado → se cargan los detalles del evento
4. Botón "Unirse" → agrega su info a `players[]`
5. Redirige a `/match/:id` en modo vista (solo lectura)

### Flujo: Ver/editar evento
1. Usuario abre `/match/:id`
2. Vista por defecto: solo lectura para todos (detalles + lista de jugadores)
3. Si es el `ownerId` → botón "Editar" visible
4. Al hacer clic en "Editar" → formulario editable + gestión de jugadores
5. Botones "Guardar" / "Cancelar" para salir del modo edición
6. Si es invitado → solo vista (detalles + su equipo asignado)

## 8. Criterios de éxito
- App funcional sin backend ni costos de infraestructura
- Tiempo de carga inicial < 2s
- 100% navegación SPA sin recargas
- Sin dependencias de pago en ningún componente
- Sin backend externo: toda la lógica y datos en el frontend
