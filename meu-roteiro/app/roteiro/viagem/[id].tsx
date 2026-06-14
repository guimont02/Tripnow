import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getWeather, type WeatherInfo } from '../../../lib/weather';
import { useTheme, type Colors } from '../../../lib/theme';
import type { Activity, Flight, Itinerary } from '../../../types';

function getLocalDateISO(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCurrentTripDay(startDate: string): number {
  const [y, m, d] = startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((todayMidnight.getTime() - start.getTime()) / 86400000) + 1;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minutesUntil(time: string): number {
  const [h, min] = time.split(':').map(Number);
  const now = new Date();
  return (h * 60 + min) - (now.getHours() * 60 + now.getMinutes());
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 16, gap: 16, paddingBottom: 100 },

    // Warning banner
    warningBanner: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    warningYellow: { backgroundColor: '#FEF3C7' },
    warningRed: { backgroundColor: '#FEE2E2' },
    warningText: { fontSize: 14, fontWeight: '600', flex: 1 },
    warningTextYellow: { color: '#92400E' },
    warningTextRed: { color: '#991B1B' },

    // Header
    header: { backgroundColor: colors.surface, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerDay: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    headerCity: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 2 },
    headerWeather: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

    // Section titles
    sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 },

    // Next activity card
    nextCard: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      padding: 22,
      gap: 10,
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    nextLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 1.2 },
    nextTitle: { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 30 },
    nextTime: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    nextStatus: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' },
    nextNavBtn: {
      backgroundColor: '#fff',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    nextNavBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
    doneCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    doneText: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 },
    doneSubText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

    // Agenda list
    agendaItem: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    agendaItemDone: { opacity: 0.4 },
    agendaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    agendaIcon: { fontSize: 18, width: 28, textAlign: 'center' },
    agendaInfo: { flex: 1 },
    agendaTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    agendaSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    agendaActions: { flexDirection: 'row', gap: 8, marginTop: 10, marginLeft: 40 },

    // Check-in buttons
    btnOutline: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    btnOutlineText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
    btnSolid: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    btnSolidText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    btnGreen: {
      backgroundColor: '#16A34A',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    btnGreenText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    btnGo: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    btnGoText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 },

    // Today panel
    panelCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
      marginBottom: 8,
    },
    panelTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    panelSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    panelLink: { fontSize: 14, fontWeight: '600', color: colors.primary, paddingVertical: 4 },

    // FAB
    fab: {
      position: 'absolute',
      bottom: 28,
      right: 20,
      backgroundColor: colors.primary,
      borderRadius: 28,
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}

interface Warning {
  message: string;
  level: 'yellow' | 'red';
}

export default function ViagemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, dark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [warning, setWarning] = useState<Warning | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function fetchData() {
        setLoading(true);
        const [{ data: itin }, { data: acts }, { data: fls }] = await Promise.all([
          supabase.from('itineraries').select('*').eq('id', id).single(),
          supabase.from('activities').select('*').eq('itinerary_id', id),
          supabase.from('flights').select('*').eq('itinerary_id', id).order('departure_datetime'),
        ]);
        setItinerary(itin);
        setActivities(acts ?? []);
        setFlights(fls ?? []);
        setLoading(false);

        if (itin?.cities?.length) {
          getWeather(itin.cities[0]).then(setWeather);
        }
      }
      fetchData();
    }, [id])
  );

  async function updateCheckin(
    activity: Activity,
    newStatus: 'on_way' | 'in_progress' | 'done',
    allActivities: Activity[]
  ) {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'on_way') updates.departed_at = new Date().toISOString();
    if (newStatus === 'in_progress') updates.arrived_at = new Date().toISOString();

    const { error } = await supabase.from('activities').update(updates).eq('id', activity.id);
    if (error) return;

    setActivities((prev) => prev.map((a) => a.id === activity.id ? { ...a, ...updates } : a));

    if (newStatus === 'on_way') {
      const sorted = allActivities
        .filter((a) => a.id !== activity.id && a.status !== 'done' && a.time)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
      const next = sorted[0];
      if (next?.time) {
        const mins = minutesUntil(next.time);
        if (mins >= 0 && mins < 10) {
          setWarning({ message: `🔴 ${next.title} começa em ${mins} min — corra!`, level: 'red' });
          setTimeout(() => setWarning(null), 8000);
        } else if (mins >= 10 && mins < 30) {
          setWarning({ message: `⚠️ ${next.title} começa em ${mins} min`, level: 'yellow' });
          setTimeout(() => setWarning(null), 8000);
        }
      }
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!itinerary) {
    return (
      <View style={styles.centered}>
        <Text>Itinerary not found.</Text>
      </View>
    );
  }

  const tripDay = itinerary.start_date ? getCurrentTripDay(itinerary.start_date) : 1;
  const todayISO = getTodayISO();

  const todayActivities = activities
    .filter((a) => a.day === tripDay)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const nextActivity = todayActivities.find((a) => a.status !== 'done');
  const todayFlights = flights.filter((f) => getLocalDateISO(f.departure_datetime) === todayISO);
  const currentCity = itinerary.cities?.[0] ?? itinerary.country ?? '';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Trip Mode',
          headerRight: () => (
            <Pressable onPress={toggleTheme} style={{ marginRight: 4, padding: 4 }}>
              <Text style={{ fontSize: 18 }}>{dark ? '☀️' : '🌙'}</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerDay}>
          Day {tripDay} of {itinerary.duration} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.headerCity}>{currentCity}</Text>
        {weather && (
          <Text style={styles.headerWeather}>
            {weather.emoji} {weather.temperature}°C · {weather.condition}
          </Text>
        )}
      </View>

      {warning && (
        <View style={[styles.warningBanner, warning.level === 'red' ? styles.warningRed : styles.warningYellow]}>
          <Text style={[styles.warningText, warning.level === 'red' ? styles.warningTextRed : styles.warningTextYellow]}>
            {warning.message}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Next activity */}
        <Text style={styles.sectionTitle}>Next up</Text>
        {nextActivity ? (
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>
              {nextActivity.status === 'on_way' ? 'A caminho' : nextActivity.status === 'in_progress' ? 'Em andamento' : 'Coming up'}
            </Text>
            <Text style={styles.nextTitle}>{nextActivity.title}</Text>
            {nextActivity.time && <Text style={styles.nextTime}>{nextActivity.time.slice(0, 5)}</Text>}
            {nextActivity.status === 'on_way' && nextActivity.departed_at && (
              <Text style={styles.nextStatus}>Saiu às {formatTime(nextActivity.departed_at)}</Text>
            )}
            {nextActivity.status === 'in_progress' && nextActivity.arrived_at && (
              <Text style={styles.nextStatus}>Chegou às {formatTime(nextActivity.arrived_at)}</Text>
            )}
            {nextActivity.location && (
              <Pressable style={styles.nextNavBtn} onPress={() => Linking.openURL(nextActivity.location!)}>
                <Text style={styles.nextNavBtnText}>Navigate →</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.doneCard}>
            <Text style={{ fontSize: 28 }}>🎉</Text>
            <Text style={styles.doneText}>All done for today!</Text>
            <Text style={styles.doneSubText}>Ask the agent for tonight's suggestions</Text>
          </View>
        )}

        {/* Today's agenda */}
        <Text style={styles.sectionTitle}>Today's agenda</Text>
        {todayActivities.length === 0 ? (
          <Text style={styles.emptyText}>No activities planned for today.</Text>
        ) : (
          todayActivities.map((item) => {
            const isDone = item.status === 'done';
            const isOnWay = item.status === 'on_way';
            const isInProgress = item.status === 'in_progress';
            const icon = isDone ? '✓' : isOnWay ? '→' : isInProgress ? '●' : (item.time?.slice(0, 5) ?? '•');

            return (
              <View key={item.id} style={[styles.agendaItem, isDone && styles.agendaItemDone]}>
                <View style={styles.agendaRow}>
                  <Text style={styles.agendaIcon}>{icon}</Text>
                  <View style={styles.agendaInfo}>
                    <Text style={styles.agendaTitle}>{item.title}</Text>
                    <Text style={styles.agendaSub}>
                      {isOnWay && item.departed_at ? `A caminho desde ${formatTime(item.departed_at)}` :
                       isInProgress && item.arrived_at ? `Em andamento · chegou ${formatTime(item.arrived_at)}` :
                       isDone ? 'Concluído' :
                       item.type}
                    </Text>
                  </View>
                </View>

                {!isDone && (
                  <View style={styles.agendaActions}>
                    {!item.status && (
                      <Pressable style={styles.btnOutline} onPress={() => updateCheckin(item, 'on_way', todayActivities)}>
                        <Text style={styles.btnOutlineText}>A caminho</Text>
                      </Pressable>
                    )}
                    {isOnWay && (
                      <Pressable style={styles.btnSolid} onPress={() => updateCheckin(item, 'in_progress', todayActivities)}>
                        <Text style={styles.btnSolidText}>Cheguei</Text>
                      </Pressable>
                    )}
                    {isInProgress && (
                      <Pressable style={styles.btnGreen} onPress={() => updateCheckin(item, 'done', todayActivities)}>
                        <Text style={styles.btnGreenText}>Saí</Text>
                      </Pressable>
                    )}
                    {item.location && (
                      <Pressable style={styles.btnGo} onPress={() => Linking.openURL(item.location!)}>
                        <Text style={styles.btnGoText}>Go</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Today panel */}
        <Text style={styles.sectionTitle}>Today</Text>
        {todayFlights.map((f) => (
          <View key={f.id} style={styles.panelCard}>
            <Text style={styles.panelTitle}>
              ✈️ {f.airline} {f.flight_number ?? ''} · {f.origin} → {f.destination}
            </Text>
            <Text style={styles.panelSub}>
              {new Date(f.departure_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {f.locator ? ` · ${f.locator}` : ''}
            </Text>
          </View>
        ))}
        <Pressable style={styles.panelCard} onPress={() => router.push(`/documentos/${id}`)}>
          <Text style={styles.panelLink}>Documents →</Text>
        </Pressable>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push(`/roteiro/agente/${id}?mode=viagem`)}>
        <Text style={styles.fabText}>✨ Ask agent</Text>
      </Pressable>
    </>
  );
}
