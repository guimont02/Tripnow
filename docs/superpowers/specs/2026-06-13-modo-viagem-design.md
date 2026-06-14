# Modo Viagem — Design Spec

**Date:** 2026-06-13
**Status:** Approved

## Overview

A dedicated "Trip Mode" experience that activates during the trip dates. Shifts the app from planning to execution — acting as a personal travel companion that shows what's next, enables one-tap navigation, surfaces relevant documents/flights, and gives the AI agent real-time context (time, weather) to suggest adjustments on the fly.

## Goals

- Make the app useful *during* the trip, not just for planning
- Surface the right information at the right moment without the user having to dig
- Make planning feel less like a chore by showing the payoff in action
- Lay groundwork for future multi-user / group travel features

## Architecture

### New file

```
meu-roteiro/app/roteiro/viagem/[id].tsx   # Modo Viagem screen
```

### Entry point

In `app/roteiro/[id].tsx`, when `start_date <= today <= start_date + duration - 1`, a "Modo Viagem" button appears in the header. Outside that window the button is hidden — no error handling needed on the trip mode screen itself.

---

## Section 1 — Screen Structure

Three vertical blocks inside a `ScrollView`:

1. **Next activity card** — highlighted card with name, time, type, and a "Navegar" button
2. **Today's agenda** — full chronological list of the day's activities; past ones are dimmed with a check mark
3. **Today panel** — today's flights + link to trip documents

A floating action button (bottom-right) opens the AI agent: `agente/[id].tsx?mode=viagem`.

---

## Section 2 — Data & Real-Time Context

### Current time
`new Date()` on screen load. Used to determine which activity is "next" and which are past.

### Weather
- API: `open-meteo.com` (free, no API key required)
- Flow:
  1. Convert city name → coordinates via `geocoding-api.open-meteo.com`
  2. Fetch current weather (temperature + condition code) via `api.open-meteo.com`
  3. Cache coordinates in AsyncStorage with key `weather_coords_<city>` to avoid repeated geocoding calls
- If either request fails: widget is silently hidden, screen works normally

### AI agent context (injected into system prompt when `mode=viagem`)
```
- Current trip day: X of Y
- Current time: HH:MM
- Weather in <city>: <temp>°C, <condition>
- Next activity: <title> at <time>
```

This allows context-aware responses like "you have 30 minutes before the Louvre — want a nearby café suggestion?" without additional integrations.

---

## Section 3 — Components

### Header
- "Day X of Y" label + current date
- Current city (first city in `itinerary.cities`)
- Weather widget: condition icon + temperature (hidden on error)

### Next activity card
- Prominent card at top of screen
- Shows: activity name, time, type badge
- "Navegar" button → `Linking.openURL(activity.location)` (hidden if `location` is null)
- Fallback when no upcoming activities: "Você completou todas as atividades de hoje 🎉"

### Today's agenda list
- Activities for current day sorted by `time`
- Past activities: reduced opacity + check icon
- Future activities: normal style + "Navegar" button (when `location` exists)
- Empty state: "Nenhuma atividade planejada. Quer sugestões do agente?"

### Today panel
- Flights matching today's date (reuses `getLocalDateISO` / `getDayDateISO` logic from `[id].tsx`)
- "Documentos" link → navigates to `documentos/[itinerary_id].tsx`

### Agent FAB
- Floating button, bottom-right
- Navigates to `agente/[id].tsx` with query param `?mode=viagem`
- Agent screen reads the param and injects real-time context into the system prompt

---

## Section 4 — Error Handling & Edge Cases

| Case | Behavior |
|---|---|
| Weather API fails | Widget hidden silently; screen unaffected |
| City not found in geocoding | Weather widget hidden; coords not cached |
| Activity has no `location` | "Navegar" button hidden |
| No activities planned for the day | Empty state message + agent FAB highlighted |
| Supabase fetch fails | Error state with retry button (consistent with rest of app) |
| Screen accessed outside trip dates | Not reachable — entry button is hidden in `[id].tsx` |

---

## Out of Scope (future)

- Multi-city day tracking (current: uses first city for weather)
- Push notifications ("time to leave for next activity")
- Real-time location awareness
- Group/shared itinerary access
