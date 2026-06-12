# meu-roteiro — Travel Itinerary App

## Project Purpose
Mobile app (iOS/Android) to create and manage personal travel itineraries.
The user can create trips (independent of dates or country) and add activities to each one.

## Tech Stack
- **Framework:** React Native with Expo (TypeScript)
- **Navigation:** Expo Router (file-based routing inside /app)
- **Backend/DB:** Supabase (PostgreSQL + Auth + SDK)
- **Language:** TypeScript strict mode

## Project Structure
meu-roteiro/
├── app/
│   ├── index.tsx              # Home screen — list of itineraries
│   ├── roteiro/
│   │   ├── [id].tsx           # Itinerary detail — list of activities
│   │   └── nova.tsx           # Create new itinerary
│   └── atividade/
│       └── nova.tsx           # Add activity to an itinerary
├── components/                # Reusable UI components
├── lib/
│   └── supabase.ts            # Supabase client setup
├── types/
│   └── index.ts               # TypeScript interfaces
└── assets/

## Database Schema (Supabase)
```sql
-- Itineraries
create table itineraries (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  country text,
  created_at timestamp default now()
);

-- Activities
create table activities (
  id uuid default gen_random_uuid() primary key,
  itinerary_id uuid references itineraries(id) on delete cascade,
  title text not null,
  date date,
  time time,
  notes text,
  created_at timestamp default now()
);
```

## TypeScript Interfaces
```ts
interface Itinerary {
  id: string;
  name: string;
  country?: string;
  created_at: string;
}

interface Activity {
  id: string;
  itinerary_id: string;
  title: string;
  date?: string;
  time?: string;
  notes?: string;
  created_at: string;
}
```

## Coding Guidelines
- Use functional components with hooks only
- Keep components small and single-responsibility
- Always type props explicitly with TypeScript interfaces
- Use async/await for all Supabase calls, always with try/catch
- Prefer simple and readable code over clever abstractions
- No unnecessary dependencies — solve with native RN or Expo SDK first

## Commands
- Start dev server: `npx expo start`
- Type check: `npx tsc --noEmit`
- Install package: `npx expo install <package>`

## Current Task
Build the MVP with the following screens:

1. **Home screen** (`app/index.tsx`)
   - List all itineraries from Supabase
   - Button to navigate to create new itinerary

2. **Create itinerary** (`app/roteiro/nova.tsx`)
   - Form: name (required) + country (optional)
   - Save to Supabase and go back to home

3. **Itinerary detail** (`app/roteiro/[id].tsx`)
   - Show itinerary name and country
   - List all activities for this itinerary
   - Button to add new activity

4. **Add activity** (`app/atividade/nova.tsx`)
   - Form: title (required), date (optional), time (optional), notes (optional)
   - Receives itinerary_id as param
   - Save to Supabase and go back to detail screen

Build one screen at a time, confirm it works, then proceed to the next.
After each screen, run `npx tsc --noEmit` to check for type errors.