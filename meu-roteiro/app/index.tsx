import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme, type Colors } from '../lib/theme';
import type { Itinerary } from '../types';

const ACCENT_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

function getAccentColor(index: number) {
  return ACCENT_COLORS[index % ACCENT_COLORS.length];
}

const FLAG_MAP: Record<string, string> = {
  italy: '🇮🇹', japan: '🇯🇵', france: '🇫🇷', brazil: '🇧🇷', spain: '🇪🇸',
  portugal: '🇵🇹', germany: '🇩🇪', usa: '🇺🇸', 'united states': '🇺🇸',
  uk: '🇬🇧', 'united kingdom': '🇬🇧', england: '🇬🇧', mexico: '🇲🇽',
  argentina: '🇦🇷', colombia: '🇨🇴', peru: '🇵🇪', chile: '🇨🇱',
  thailand: '🇹🇭', indonesia: '🇮🇩', australia: '🇦🇺', canada: '🇨🇦',
  china: '🇨🇳', india: '🇮🇳', greece: '🇬🇷', turkey: '🇹🇷', egypt: '🇪🇬',
  morocco: '🇲🇦', 'south africa': '🇿🇦', netherlands: '🇳🇱',
  switzerland: '🇨🇭', austria: '🇦🇹', czechia: '🇨🇿', 'czech republic': '🇨🇿',
  poland: '🇵🇱', norway: '🇳🇴', sweden: '🇸🇪', denmark: '🇩🇰',
  finland: '🇫🇮', ireland: '🇮🇪', 'new zealand': '🇳🇿', singapore: '🇸🇬',
  'south korea': '🇰🇷', vietnam: '🇻🇳', croatia: '🇭🇷', iceland: '🇮🇸',
  cuba: '🇨🇺', russia: '🇷🇺', ukraine: '🇺🇦', israel: '🇮🇱',
  uae: '🇦🇪', dubai: '🇦🇪', 'united arab emirates': '🇦🇪',
  cambodia: '🇰🇭', malaysia: '🇲🇾', philippines: '🇵🇭', taiwan: '🇹🇼',
  nepal: '🇳🇵', myanmar: '🇲🇲', kenya: '🇰🇪', tanzania: '🇹🇿',
  venezuela: '🇻🇪', bolivia: '🇧🇴', ecuador: '🇪🇨', uruguay: '🇺🇾',
  hungary: '🇭🇺', romania: '🇷🇴', bulgaria: '🇧🇬', serbia: '🇷🇸',
  slovakia: '🇸🇰', slovenia: '🇸🇮', latvia: '🇱🇻', lithuania: '🇱🇹',
  estonia: '🇪🇪', belgium: '🇧🇪', luxembourg: '🇱🇺',
};

function countryFlag(country: string): string {
  return FLAG_MAP[country.toLowerCase()] ?? '🌍';
}

function getTripStatus(item: Itinerary): { label: string; color: string } | null {
  if (!item.start_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(item.start_date);
  const end = new Date(item.start_date);
  end.setDate(end.getDate() + (item.duration ?? 1) - 1);
  const diffStart = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffStart > 0) return { label: `In ${diffStart}d`, color: '#3B82F6' };
  if (today <= end) {
    const day = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { label: `Day ${day}/${item.duration ?? 1}`, color: '#10B981' };
  }
  return { label: 'Completed', color: '#9CA3AF' };
}

interface TripCardProps {
  item: Itinerary;
  index: number;
  colors: Colors;
  onPress: () => void;
  onLongPress: () => void;
}

function TripCard({ item, index, colors, onPress, onLongPress }: TripCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 65,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 65,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, speed: 50, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, speed: 50, useNativeDriver: true }).start();
  }

  const color = getAccentColor(index);
  const status = getTripStatus(item);
  const flag = countryFlag(item.country ?? '');

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        style={[cardStyles.card, { backgroundColor: colors.surface }]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        <View style={[cardStyles.accentBar, { backgroundColor: color }]} />
        <View style={cardStyles.content}>
          <View style={cardStyles.topRow}>
            <Text style={cardStyles.flag}>{flag}</Text>
            <Text style={[cardStyles.country, { color: colors.text }]} numberOfLines={1}>
              {item.country}
            </Text>
            {status && (
              <View style={[cardStyles.pill, { backgroundColor: status.color + '18' }]}>
                <Text style={[cardStyles.pillText, { color: status.color }]}>{status.label}</Text>
              </View>
            )}
          </View>

          {item.cities && item.cities.length > 0 && (
            <Text style={[cardStyles.cities, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.cities.join(' · ')}
            </Text>
          )}

          <View style={cardStyles.metaRow}>
            {item.start_date && (
              <Text style={[cardStyles.meta, { color: colors.textMuted }]}>
                {new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
            {item.start_date && item.duration && (
              <Text style={[cardStyles.metaDivider, { color: colors.borderInput }]}>·</Text>
            )}
            {item.duration && (
              <Text style={[cardStyles.meta, { color: colors.textMuted }]}>
                {item.duration} {item.duration === 1 ? 'day' : 'days'}
              </Text>
            )}
          </View>
        </View>

        <Text style={[cardStyles.chevron, { color }]}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flag: {
    fontSize: 22,
  },
  country: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cities: {
    fontSize: 13,
    marginLeft: 30,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 30,
    marginTop: 1,
  },
  meta: {
    fontSize: 12,
  },
  metaDivider: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 26,
    fontWeight: '300',
    paddingRight: 18,
    paddingLeft: 4,
  },
});

export default function HomeScreen() {
  const router = useRouter();
  const { colors, dark, toggleTheme } = useTheme();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-10)).current;

  async function fetchItineraries(isRefresh = false) {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setItineraries(data ?? []);
    } catch {
      setError('Failed to load trips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchItineraries(true);
  }

  function confirmDelete(item: Itinerary) {
    Alert.alert(
      'Delete Trip',
      `Delete "${item.name}"? This will also remove all activities.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('itineraries').delete().eq('id', item.id);
            if (error) {
              Alert.alert('Error', 'Failed to delete trip.');
            } else {
              setItineraries((prev) => prev.filter((i) => i.id !== item.id));
            }
          },
        },
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      fetchItineraries();
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(headerTranslateY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
          { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Trips</Text>
          {!loading && (
            <Text style={[styles.tripCount, { color: colors.textMuted }]}>
              {itineraries.length === 0
                ? 'Plan your first adventure'
                : `${itineraries.length} ${itineraries.length === 1 ? 'trip' : 'trips'} planned`}
            </Text>
          )}
        </View>
        <Pressable
          style={[styles.themeToggle, { backgroundColor: colors.surfaceAlt }]}
          onPress={toggleTheme}
        >
          <Text style={styles.themeToggleIcon}>{dark ? '☀️' : '🌙'}</Text>
        </Pressable>
      </Animated.View>

      {loading && (
        <View style={styles.centered}>
          <Text style={styles.loadingDot}>✈️</Text>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading your trips...</Text>
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Something went wrong</Text>
          <Text style={[styles.stateSubtitle, { color: colors.textMuted }]}>{error}</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: colors.primaryLight }]} onPress={() => fetchItineraries()}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && itineraries.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.stateEmoji}>🗺️</Text>
          <Text style={[styles.stateTitle, { color: colors.text }]}>No trips yet</Text>
          <Text style={[styles.stateSubtitle, { color: colors.textMuted }]}>
            Tap the button below to start planning your first adventure.
          </Text>
        </View>
      )}

      {!loading && !error && itineraries.length > 0 && (
        <FlatList
          data={itineraries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item, index }) => (
            <TripCard
              item={item}
              index={index}
              colors={colors}
              onPress={() => router.push(`/roteiro/${item.id}`)}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      )}

      <Pressable style={[styles.fab, { backgroundColor: colors.fabBg }]} onPress={() => router.push('/roteiro/nova')}>
        <Text style={[styles.fabText, { color: colors.fabText }]}>+ New Trip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tripCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  loadingDot: {
    fontSize: 40,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 15,
  },
  stateEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: 20,
    paddingBottom: 120,
    gap: 12,
  },
  themeToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: {
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
