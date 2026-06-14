# Activity Check-in — Design Spec

**Date:** 2026-06-14
**Status:** Approved

## Overview

Add a manual check-in flow to the Trip Mode screen. Instead of relying solely on the clock to determine progress, the user controls the pace by tapping "A caminho", "Cheguei", and "Saí" on each activity. The app records timestamps permanently and warns if the next activity is starting soon.

## Goals

- Let the user signal their real-time position in the itinerary
- Record arrival/departure times permanently for future reference and AI context
- Warn when the next activity is approaching after tapping "A caminho"

## Section 1 — Data Model

### Supabase migration
```sql
alter table activities 
  add column status text check (status in ('on_way', 'in_progress', 'done')),
  add column departed_at timestamptz,
  add column arrived_at timestamptz;
```

All three fields are optional — activities without interaction keep `status = null`. No data migration needed.

### TypeScript interface update (`types/index.ts`)
```ts
interface Activity {
  // existing fields...
  status?: 'on_way' | 'in_progress' | 'done';
  departed_at?: string;
  arrived_at?: string;
}
```

---

## Section 2 — UX & State Machine

Each agenda item in `viagem/[id].tsx` has action buttons that change per state:

### State transitions

| State | Trigger | DB update |
|---|---|---|
| `null` → `on_way` | Tap "A caminho" | `status = 'on_way'`, `departed_at = now()` |
| `on_way` → `in_progress` | Tap "Cheguei" | `status = 'in_progress'`, `arrived_at = now()` |
| `in_progress` → `done` | Tap "Saí" | `status = 'done'` |

### Visual per state

**null (no status)**
- Left icon: time in blue
- Right button: `[ A caminho ]` (outline style)

**on_way**
- Left icon: `→` (blue)
- Subtitle: "A caminho desde HH:mm"
- Right button: `[ Cheguei ]` (solid blue)

**in_progress**
- Left icon: `●` (green)
- Subtitle: "Em andamento · chegou HH:mm"
- Right buttons: `[ Saí ]` + `[ Go ]` (navigate)

**done**
- Reduced opacity (same as past-time style)
- Left icon: `✓`
- Subtitle: "Concluído"
- No action buttons

### Next Up card
Always shows the first activity of the day that does NOT have status `done`, regardless of time. This ensures the card reflects user progress, not just the clock.

---

## Section 3 — Warning Logic & Error Handling

### Late warning
Triggered when user taps "A caminho". App finds the next activity on the day that isn't `done` and calculates:

```
minutesLeft = nextActivity.time - currentTime
```

| minutesLeft | Behavior |
|---|---|
| ≥ 30 min | No warning |
| 10–29 min | Yellow banner: "⚠️ {name} começa em X minutos" |
| < 10 min | Red banner: "🔴 {name} começa em X minutos — corra!" |
| Next activity has no time | No warning |
| No next activity | No warning |

Banner auto-dismisses after 8 seconds.

### Error handling

| Case | Behavior |
|---|---|
| Supabase save fails | Show error toast, revert to previous state |
| Activity has no time | Buttons work normally, no warning calculation |
| Last activity of the day | "A caminho" works, no warning (no next activity) |
| App closed while `on_way` | On reopen, activity still shows "A caminho desde HH:mm" |

---

## Out of Scope (future)

- Travel time estimation (Google Maps API)
- Configurable buffer time per activity
- Push notification when next activity is approaching
- Trip summary / history view using check-in timestamps
