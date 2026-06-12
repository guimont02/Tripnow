import { useCallback, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, type Colors } from '../../lib/theme';
import type { Activity, ActivityType, Flight, Itinerary } from '../../types';

function getDayDate(startDate: string, day: number): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + day - 1);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDayDateISO(startDate: string, day: number): string {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + day - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getLocalDateISO(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatFlightTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const SECTIONS: { type: ActivityType; label: string; emoji: string }[] = [
  { type: 'restaurant', label: 'Restaurants', emoji: '🍽' },
  { type: 'place', label: 'Places', emoji: '📍' },
  { type: 'attraction', label: 'Attractions', emoji: '🎡' },
];

type Period = 'morning' | 'afternoon' | 'night' | 'unscheduled';

const PERIODS: { key: Period; label: string; emoji: string }[] = [
  { key: 'morning', label: 'Morning', emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { key: 'night', label: 'Night', emoji: '🌙' },
  { key: 'unscheduled', label: 'Unscheduled', emoji: '📌' },
];

function getPeriod(time?: string | null): Period {
  if (!time) return 'unscheduled';
  const [h] = time.split(':').map(Number);
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'night';
}

function sortByTime(a: Activity, b: Activity): number {
  if (!a.time && !b.time) return 0;
  if (!a.time) return 1;
  if (!b.time) return -1;
  return a.time.localeCompare(b.time);
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: colors.textMuted, fontSize: 15 },
    header: {
      backgroundColor: '#3B82F6',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
    },
    headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    headerInfo: { flex: 1 },
    headerActions: { flexDirection: 'row', gap: 8, marginLeft: 12 },
    editBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    editBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    aiBtn: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    aiBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    themeBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 8,
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeBtnText: { fontSize: 16 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
    headerSubtitle: { fontSize: 15, color: '#bfdbfe', marginTop: 2 },
    headerDuration: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
    daySelector: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      maxHeight: 68,
    },
    daySelectorContent: { paddingHorizontal: 12, alignItems: 'center', gap: 8 },
    dayTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    dayTabActive: { backgroundColor: '#3B82F6' },
    dayTabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    dayTabTextActive: { color: '#fff' },
    dayTabDate: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    dayTabDateActive: { color: '#bfdbfe' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 48, gap: 16 },
    addRow: { flexDirection: 'row', gap: 8 },
    addBtn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderInput,
      gap: 4,
    },
    addBtnEmoji: { fontSize: 18 },
    addBtnText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
    emptyDay: {
      color: colors.textMuted,
      fontSize: 14,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 24,
    },
    periodBlock: { gap: 8 },
    periodLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    activityCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      borderLeftWidth: 3,
      borderLeftColor: '#3B82F6',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
      gap: 3,
    },
    activityCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    activityTypeTag: { fontSize: 11, color: colors.textMuted, fontWeight: '600', flex: 1 },
    activityTime: { fontSize: 12, fontWeight: '700', color: colors.primary },
    activityPrice: { fontSize: 12, fontWeight: '700', color: colors.success },
    activityTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
    activityMeta: { fontSize: 13, color: colors.textSecondary },
    locationBtn: {
      marginTop: 6,
      backgroundColor: colors.primaryLight,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    },
    locationBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    activityNotes: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
    pdfBtn: {
      marginTop: 8,
      backgroundColor: colors.primaryLight,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    },
    pdfBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    cardHint: { fontSize: 11, color: colors.borderInput, marginTop: 4 },
    flightSection: { gap: 8 },
    flightSectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    flightCard: {
      backgroundColor: '#0c2340',
      borderRadius: 12,
      padding: 16,
      gap: 4,
    },
    flightCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    flightAirline: { fontSize: 12, fontWeight: '700', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5 },
    flightNumber: { fontSize: 12, color: '#93c5fd' },
    flightRoute: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 3 },
    flightTime: { fontSize: 13, color: '#bfdbfe' },
    flightLocator: { fontSize: 13, color: '#60a5fa', fontWeight: '600', marginTop: 4 },
    flightHint: { fontSize: 11, color: '#475569', marginTop: 4 },
    addFlightBtn: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderInput,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    addFlightBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  });
}

export default function RoteiroDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, dark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(true);

  function confirmDeleteActivity(item: Activity) {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('activities').delete().eq('id', item.id);
            if (error) {
              Alert.alert('Error', 'Failed to delete activity.');
            } else {
              setActivities((prev) => prev.filter((a) => a.id !== item.id));
            }
          },
        },
      ]
    );
  }

  async function fetchData() {
    try {
      setLoading(true);
      const [{ data: itin }, { data: acts }, { data: fls }] = await Promise.all([
        supabase.from('itineraries').select('*').eq('id', id).single(),
        supabase.from('activities').select('*').eq('itinerary_id', id),
        supabase.from('flights').select('*').eq('itinerary_id', id).order('departure_datetime'),
      ]);
      setItinerary(itin);
      setActivities(acts ?? []);
      setFlights(fls ?? []);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

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
        <Text style={styles.errorText}>Itinerary not found.</Text>
      </View>
    );
  }

  const days = Array.from({ length: itinerary.duration ?? 1 }, (_, i) => i + 1);
  const dayActivities = activities.filter((a) => a.day === selectedDay);

  const dayFlights = flights.filter((f) => {
    const flightDate = getLocalDateISO(f.departure_datetime);
    if (itinerary.start_date) {
      const dayDate = getDayDateISO(itinerary.start_date, selectedDay);
      console.log(`[flights] flight=${flightDate} dayDate=${dayDate} day=${selectedDay} start=${itinerary.start_date}`);
      return flightDate === dayDate;
    }
    console.log(`[flights] no start_date, flightDate=${flightDate} selectedDay=${selectedDay}`);
    return selectedDay === 1;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{itinerary.country}</Text>
            {itinerary.cities && itinerary.cities.length > 0 && (
              <Text style={styles.headerSubtitle}>{itinerary.cities.join(' · ')}</Text>
            )}
            <Text style={styles.headerDuration}>
              {itinerary.duration} {itinerary.duration === 1 ? 'day' : 'days'}
              {itinerary.start_date ? ` · from ${new Date(itinerary.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.editBtn} onPress={() => router.push(`/roteiro/editar/${id}`)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.editBtn} onPress={() => router.push(`/documentos/${id}`)}>
              <Text style={styles.editBtnText}>Docs</Text>
            </Pressable>
            <Pressable style={styles.aiBtn} onPress={() => router.push(`/roteiro/agente/${id}`)}>
              <Text style={styles.aiBtnText}>✨ AI</Text>
            </Pressable>
            <Pressable style={styles.themeBtn} onPress={toggleTheme}>
              <Text style={styles.themeBtnText}>{dark ? '☀️' : '🌙'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {days.map((day) => (
          <Pressable
            key={day}
            style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
            onPress={() => setSelectedDay(day)}
          >
            <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextActive]}>
              Day {day}
            </Text>
            {itinerary.start_date && (
              <Text style={[styles.dayTabDate, selectedDay === day && styles.dayTabDateActive]}>
                {getDayDate(itinerary.start_date, day)}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {dayFlights.length > 0 && (
          <View style={styles.flightSection}>
            <Text style={styles.flightSectionLabel}>✈️ Voos</Text>
            {dayFlights.map((flight) => (
              <Pressable
                key={flight.id}
                style={styles.flightCard}
                onPress={() => router.push(`/voo/${flight.id}`)}
              >
                <View style={styles.flightCardHeader}>
                  <Text style={styles.flightAirline}>{flight.airline}</Text>
                  {flight.flight_number && (
                    <Text style={styles.flightNumber}>{flight.flight_number}</Text>
                  )}
                </View>
                <Text style={styles.flightRoute}>
                  {flight.origin} → {flight.destination}
                </Text>
                <Text style={styles.flightTime}>
                  Partida: {formatFlightTime(flight.departure_datetime)}
                  {flight.arrival_datetime
                    ? `  ·  Chegada: ${formatFlightTime(flight.arrival_datetime)}`
                    : ''}
                </Text>
                {flight.locator && (
                  <Text style={styles.flightLocator}>Localizador: {flight.locator}</Text>
                )}
                <Text style={styles.flightHint}>Toque para editar</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.addRow}>
          {SECTIONS.map((section) => (
            <Pressable
              key={section.type}
              style={styles.addBtn}
              onPress={() =>
                router.push(`/atividade/nova?itinerary_id=${id}&day=${selectedDay}&type=${section.type}`)
              }
            >
              <Text style={styles.addBtnEmoji}>{section.emoji}</Text>
              <Text style={styles.addBtnText}>+ {section.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.addFlightBtn}
          onPress={() => router.push(`/voo/novo?itinerary_id=${id}`)}
        >
          <Text style={{ fontSize: 16 }}>✈️</Text>
          <Text style={styles.addFlightBtnText}>+ Adicionar Voo</Text>
        </Pressable>

        {dayActivities.length === 0 ? (
          <Text style={styles.emptyDay}>No activities for Day {selectedDay} yet.</Text>
        ) : (
          PERIODS.map((period) => {
            const items = dayActivities
              .filter((a) => getPeriod(a.time) === period.key)
              .sort(sortByTime);

            if (items.length === 0) return null;

            return (
              <View key={period.key} style={styles.periodBlock}>
                <Text style={styles.periodLabel}>
                  {period.emoji} {period.label}
                </Text>
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    const section = SECTIONS.find((s) => s.type === item.type);
                    return (
                      <Pressable
                        style={styles.activityCard}
                        onPress={() => router.push(`/atividade/${item.id}`)}
                        onLongPress={() => confirmDeleteActivity(item)}
                      >
                        <View style={styles.activityCardHeader}>
                          <Text style={styles.activityTypeTag}>
                            {section?.emoji} {section?.label.slice(0, -1)}
                          </Text>
                          {item.time && (
                            <Text style={styles.activityTime}>{item.time.slice(0, 5)}</Text>
                          )}
                          {item.estimated_price && (
                            <Text style={styles.activityPrice}>{item.estimated_price}</Text>
                          )}
                        </View>
                        <Text style={styles.activityTitle}>{item.title}</Text>
                        {item.culinary_type && (
                          <Text style={styles.activityMeta}>🍴 {item.culinary_type}</Text>
                        )}
                        {item.location && (
                          <Pressable
                            style={styles.locationBtn}
                            onPress={() => Linking.openURL(item.location!)}
                          >
                            <Text style={styles.locationBtnText}>📍 Open in Maps</Text>
                          </Pressable>
                        )}
                        {item.notes && (
                          <Text style={styles.activityNotes}>{item.notes}</Text>
                        )}
                        {item.pdf_url && (
                          <Pressable
                            style={styles.pdfBtn}
                            onPress={() => Linking.openURL(item.pdf_url!)}
                          >
                            <Text style={styles.pdfBtnText}>📄 View PDF</Text>
                          </Pressable>
                        )}
                        <Text style={styles.cardHint}>Tap to edit · Hold to delete</Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
