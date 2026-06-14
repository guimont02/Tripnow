import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WeatherInfo {
  temperature: number;
  condition: string;
  emoji: string;
}

const WMO_CODES: Record<number, { condition: string; emoji: string }> = {
  0: { condition: 'Clear sky', emoji: '☀️' },
  1: { condition: 'Mainly clear', emoji: '🌤️' },
  2: { condition: 'Partly cloudy', emoji: '⛅' },
  3: { condition: 'Overcast', emoji: '☁️' },
  45: { condition: 'Foggy', emoji: '🌫️' },
  48: { condition: 'Foggy', emoji: '🌫️' },
  51: { condition: 'Light drizzle', emoji: '🌦️' },
  53: { condition: 'Drizzle', emoji: '🌦️' },
  55: { condition: 'Heavy drizzle', emoji: '🌧️' },
  61: { condition: 'Light rain', emoji: '🌧️' },
  63: { condition: 'Rain', emoji: '🌧️' },
  65: { condition: 'Heavy rain', emoji: '🌧️' },
  71: { condition: 'Light snow', emoji: '🌨️' },
  73: { condition: 'Snow', emoji: '❄️' },
  75: { condition: 'Heavy snow', emoji: '❄️' },
  80: { condition: 'Rain showers', emoji: '🌦️' },
  81: { condition: 'Rain showers', emoji: '🌧️' },
  82: { condition: 'Violent showers', emoji: '⛈️' },
  95: { condition: 'Thunderstorm', emoji: '⛈️' },
  99: { condition: 'Thunderstorm', emoji: '⛈️' },
};

const COORDS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getCoordsForCity(city: string, country?: string): Promise<{ lat: number; lon: number } | null> {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedCountry = country?.trim().toLowerCase() ?? '';
  const cacheKey = `weather_coords_${normalizedCity}_${normalizedCountry}`;

  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    const parsed: { lat: number; lon: number; cachedAt: number } = JSON.parse(cached);
    if (Date.now() - parsed.cachedAt < COORDS_TTL_MS) {
      return { lat: parsed.lat, lon: parsed.lon };
    }
  }

  const query = country ? `${city}, ${country}` : city;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results?.length) return null;

  const entry = { lat: data.results[0].latitude, lon: data.results[0].longitude, cachedAt: Date.now() };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  return { lat: entry.lat, lon: entry.lon };
}

export async function getWeather(city: string, country?: string): Promise<WeatherInfo | null> {
  try {
    const coords = await getCoordsForCity(city, country);
    if (!coords) return null;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&temperature_unit=celsius`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    const { condition, emoji } = WMO_CODES[code] ?? { condition: 'Unknown', emoji: '🌡️' };

    return { temperature: temp, condition, emoji };
  } catch {
    return null;
  }
}
