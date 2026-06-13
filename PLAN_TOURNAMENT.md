# Torneo (Fase 3) — Plan de Implementación

## Resumen
Módulo para organizar torneos de FIFA. El dueño crea el torneo, agrega participantes con nombres de equipo, y el sistema genera todos los enfrentamientos posibles (round-robin). Cada partido se registra vía modal con los datos del encuentro.

## Diferencias con Match (Fase 1/2)

| Aspecto | Match | Torneo |
|---------|-------|--------|
| Link de invitación | Sí (`/join/:hash`) | No |
| Confirmación individual | Sí (cada jugador se une) | No (el dueño agrega participantes) |
| Equipos | Jugadores divididos en 2 equipos | Cada participante tiene su propio equipo |
| Enfrentamientos | Aleatorios (Fase 2) | Todos contra todos (round-robin) |
| Registro de resultados | No aplica | Sí, modal por partido |

## Modelo de datos (nuevo store: `tournaments`)

```js
{
  id: string,                // UUID
  ownerId: string,           // Google ID del creador
  title: string,             // nombre del torneo
  description: string,       // opcional
  createdAt: string,         // ISO date
  updatedAt: string,

  participants: [
    {
      id: string,            // UUID
      displayName: string,   // nombre del jugador (persona real)
      teamName: string,      // nombre del equipo FIFA que usa
      userId: string | null  // Google ID si está registrado, null si es invitado manual
    }
  ],

  matches: [
    {
      id: string,
      round: number,          // ronda/jornada
      homeParticipantId: string,
      awayParticipantId: string,
      homeScore: number | null,
      awayScore: number | null,
      status: 'pending' | 'played',
      details: string         // notas opcionales del encuentro
    }
  ]
}
```

## Detalles confirmados

| Aspecto | Decisión |
|---------|----------|
| Participantes | Solo el dueño los agrega manualmente (nombre + equipo FIFA) |
| Puntuación | 3-1-0 (3 victoria, 1 empate, 0 derrota) |
| Límite participantes | Hasta 16+ |
| Datos del partido | Solo marcador final (goles local, goles visitante) |

**Nota:** Round-robin con 16 participantes genera 120 partidos. Con 20 son 190. Considera mostrar una advertencia al dueño si excede X participantes.

## Flujo

1. Dueño hace clic en "New Tournament" en Home
2. Si no está autenticado → login con Google
3. Redirige a `/tournament` (vista de creación/torneo)
4. Dueño completa: nombre del torneo + descripción opcional
5. Dueño agrega participantes uno por uno (nombre + equipo FIFA)
6. Botón "Generate matches" → genera todos los enfrentamientos round-robin
7. Se muestra el listado de partidos con su estado (pendiente/jugado)
8. Click en un partido → modal para ingresar resultado (goles local, goles visitante)
9. Tabla de posiciones actualizada en vivo según resultados

## Generación de enfrentamientos (round-robin)

```
Participantes: [A, B, C, D]
Ronda 1: A vs B, C vs D
Ronda 2: A vs C, B vs D
Ronda 3: A vs D, B vs C
```

Cada participante juega contra todos exactamente una vez. Si hay número impar, se genera un `bye` (descansa).

## UI: Tabla de posiciones

| # | Jugador | Equipo | PJ | G | E | P | GF | GC | DG | Pts |
|---|---------|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|

## Orden de implementación

```
Paso 1: Agregar store "tournaments" en db.js
Paso 2: Crear Tournament.view.vue (formulario de creación + agregar participantes)
Paso 3: Agregar ruta /tournament en router (nueva vista)
Paso 4: Implementar algoritmo round-robin en servicio
Paso 5: Lista de partidos generados con estados
Paso 6: Modal de resultado de partido
Paso 7: Tabla de posiciones en vivo con cálculos
```
