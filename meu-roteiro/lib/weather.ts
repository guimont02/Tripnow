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

async function getCoordsForCity(city: string): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = `weather_coords_${city}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results?.length) return null;

  const coords = { lat: data.results[0].latitude, lon: data.results[0].longitude };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(coords));
  return coords;
}

export async function getWeather(city: string): Promise<WeatherInfo | null> {
  try {
    const coords = await getCoordsForCity(city);
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
