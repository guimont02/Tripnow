# TripNow — Travel Itinerary App

## Project Purpose
Mobile app (iOS/Android) to create and manage personal travel itineraries with AI-powered planning, flight tracking, and document storage.

## Tech Stack
- **Framework:** React Native 0.81.5 with Expo 54
- **Language:** TypeScript (strict mode)
- **Navigation:** Expo Router (file-based routing inside `meu-roteiro/app/`)
- **Backend/DB:** Supabase (PostgreSQL + Storage)
- **AI:** Anthropic Claude API (Sonnet 4.6) for itinerary generation
- **Key packages:** `@react-native-community/datetimepicker`, `expo-document-picker`, `expo-sharing`

## Project Structure
```
just_trip_it/
└── meu-roteiro/
    ├── app/
    │   ├── index.tsx                   # Home — list of itineraries
    │   ├── roteiro/
    │   │   ├── nova.tsx                # Create itinerary
    │   │   ├── [id].tsx                # Itinerary detail + day timeline
    │   │   ├── editar/[id].tsx         # Edit itinerary
    │   │   └── agente/[id].tsx         # AI travel agent chat
    │   ├── atividade/
    │   │   ├── nova.tsx                # Add activity (restaurant/place/attraction)
    │   │   └── [id].tsx                # Edit activity
    │   ├── voo/
    │   │   ├── novo.tsx                # Add flight
    │   │   └── [id].tsx                # Edit/delete flight
    │   └── documentos/
    │       ├── [itinerary_id].tsx      # Trip documents list
    │       └── novo.tsx                # Upload document
    ├── lib/
    │   ├── supabase.ts                 # Supabase client
    │   ├── ai.ts                       # Claude API integration
    │   └── theme.ts                    # Light/dark theme context
    ├── types/index.ts                  # TypeScript interfaces
    └── assets/
```

## Database Schema (Supabase)
All tables have RLS disabled.

```sql
create table itineraries (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  country text,
  cities text[],
  duration integer,
  start_date date,
  created_at timestamp default now()
);

create table activities (
  id uuid default gen_random_uuid() primary key,
  itinerary_id uuid references itineraries(id) on delete cascade,
  title text not null,
  type text, -- 'restaurant' | 'place' | 'attraction'
  day integer,
  time time,
  location text,
  notes text,
  culinary_type text,
  estimated_price text, -- '$' | '$$' | '$$$' | '$$$$'
  pdf_url text,
  created_at timestamp default now()
);

create table flights (
  id uuid default gen_random_uuid() primary key,
  itinerary_id uuid references itineraries(id) on delete cascade,
  airline text not null,
  flight_number text,
  origin text not null,
  destination text not null,
  departure_datetime timestamptz not null,
  arrival_datetime timestamptz,
  locator text,
  created_at timestamp default now()
);

create table trip_documents (
  id uuid default gen_random_uuid() primary key,
  itinerary_id uuid references itineraries(id) on delete cascade,
  name text not null,
  file_url text not null,
  created_at timestamp default now()
);
```

## Supabase Storage
- Bucket: `receipts` — stores PDFs and documents
  - `docs/` prefix: trip documents
  - root: activity receipts/tickets

## TypeScript Interfaces (`types/index.ts`)
```ts
interface Itinerary {
  id: string; name: string; country?: string; cities?: string[];
  duration?: number; start_date?: string; created_at: string;
}

type ActivityType = 'restaurant' | 'place' | 'attraction';

interface Activity {
  id: string; itinerary_id: string; title: string; type: ActivityType;
  day: number; time?: string; notes?: string; location?: string;
  culinary_type?: string; estimated_price?: string; pdf_url?: string; created_at: string;
}

interface Flight {
  id: string; itinerary_id: string; airline: string; flight_number?: string;
  origin: string; destination: string; departure_datetime: string;
  arrival_datetime?: string; locator?: string; created_at: string;
}

interface TripDocument {
  id: string; itinerary_id: string; name: string; file_url: string; created_at: string;
}
```

## Key Implementation Details

### Timezone handling
Dates must always use local time — never `toISOString().split('T')[0]` for date-only values:
```ts
// Correct
`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
// Wrong — shifts date in UTC-3 timezone
date.toISOString().split('T')[0]
```

### Flight day matching
Flights appear in the timeline by matching their local departure date against the itinerary day date. Both comparisons use local dates (see `getLocalDateISO` and `getDayDateISO` in `app/roteiro/[id].tsx`).

### AI agent (`lib/ai.ts`)
- Model: `claude-sonnet-4-6`
- Generates structured JSON plans wrapped in `<<<PLAN>>>...<<<END>>>` markers
- Adaptive prompt: asks questions for new trips, suggests improvements for existing ones
- Env var: `EXPO_PUBLIC_ANTHROPIC_API_KEY`
- Opening greeting is generated locally (no API call) — saves tokens on every screen open
- Conversation is persisted per itinerary in AsyncStorage with key `chat_<itinerary_id>`
- Each activity includes a `location` field with a Google Maps search URL (`https://www.google.com/maps/search/?api=1&query=Place+Name+City`)

### Theme system (`lib/theme.ts`)
- Light/dark toggle available on every screen
- Use `useTheme()` hook for colors and `toggleTheme()`
- Always use `colors.*` from theme, never hardcode colors (except flight card: `#0c2340`)

## Environment Variables
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_ANTHROPIC_API_KEY=
```

## Commands
```bash
npx expo start                                              # Start dev server
npx tsc --noEmit                                           # Type check
npx expo install <pkg>                                     # Add package
eas update --branch main --message "description"           # Publish update to Expo Go
```

## EAS Update
- Project is configured for EAS Update (expo.dev account: `monteiro_02`, project: `meu-roteiro`)
- `app.json` has `extra.eas.projectId` and `updates.url` already configured
- Publishing with `eas update` is independent of GitHub — only what's published via EAS matters
- Expo Go always loads the latest published version on the `main` branch automatically
- To install dependencies without peer dep conflicts: `npm install <pkg> --legacy-peer-deps`

## Coding Guidelines
- Functional components with hooks only
- Always type props with TypeScript interfaces
- Use `async/await` with try/catch for all Supabase calls
- Keep debug `console.log` calls with `[screen/name]` prefix for traceability
- No unnecessary abstractions — keep screens self-contained
