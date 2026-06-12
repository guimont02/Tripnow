import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useTheme, type Colors } from '../../../lib/theme';
import type { Itinerary } from '../../../types';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function displayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, paddingBottom: 48 },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 20,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    cityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    cityInput: { flex: 1 },
    removeBtn: { backgroundColor: colors.dangerLight, borderRadius: 8, padding: 10 },
    removeBtnText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
    addCityBtn: { marginTop: 4, paddingVertical: 10 },
    addCityText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    stepBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: { color: '#fff', fontSize: 22, fontWeight: '600' },
    stepValue: { fontSize: 24, fontWeight: '700', color: colors.text, minWidth: 36, textAlign: 'center' },
    dateBtn: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.borderInput,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateBtnValue: { fontSize: 16, color: colors.text, fontWeight: '600' },
    dateBtnPlaceholder: { fontSize: 16, color: colors.inputPlaceholder },
    dateClear: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 4 },
    pickerDone: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
    pickerDoneText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 40,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}

export default function EditRoteiroScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, dark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('');
  const [cities, setCities] = useState<string[]>(['']);
  const [duration, setDuration] = useState(1);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchItinerary() {
      const { data } = await supabase.from('itineraries').select('*').eq('id', id).single();
      if (data) {
        const itin = data as Itinerary;
        setCountry(itin.country ?? '');
        setCities(itin.cities && itin.cities.length > 0 ? itin.cities : ['']);
        setDuration(itin.duration ?? 1);
        if (itin.start_date) setStartDate(new Date(itin.start_date));
      }
      setLoading(false);
    }
    fetchItinerary();
  }, [id]);

  function updateCity(index: number, value: string) {
    setCities((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function addCity() {
    setCities((prev) => [...prev, '']);
  }

  function removeCity(index: number) {
    setCities((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!country.trim()) {
      Alert.alert('Required', 'Please enter a country.');
      return;
    }

    const filteredCities = cities.map((c) => c.trim()).filter(Boolean);
    const name =
      filteredCities.length > 0
        ? `${country.trim()} · ${filteredCities[0]}`
        : country.trim();

    try {
      setSaving(true);
      const { error } = await supabase.from('itineraries').update({
        name,
        country: country.trim(),
        cities: filteredCities,
        duration,
        start_date: startDate ? formatDate(startDate) : null,
      }).eq('id', id);

      if (error) throw error;
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
    <Stack.Screen options={{ headerRight: () => (
      <Pressable onPress={toggleTheme} style={{ marginRight: 4, padding: 4 }}>
        <Text style={{ fontSize: 18 }}>{dark ? '☀️' : '🌙'}</Text>
      </Pressable>
    )}} />
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      <Text style={styles.label}>Country *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Italy"
        placeholderTextColor={colors.inputPlaceholder}
        value={country}
        onChangeText={setCountry}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Cities</Text>
      {cities.map((city, index) => (
        <View key={index} style={styles.cityRow}>
          <TextInput
            style={[styles.input, styles.cityInput]}
            placeholder={`City ${index + 1}`}
            placeholderTextColor={colors.inputPlaceholder}
            value={city}
            onChangeText={(val) => updateCity(index, val)}
            autoCapitalize="words"
          />
          {cities.length > 1 && (
            <Pressable style={styles.removeBtn} onPress={() => removeCity(index)}>
              <Text style={styles.removeBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Pressable style={styles.addCityBtn} onPress={addCity}>
        <Text style={styles.addCityText}>+ Add city</Text>
      </Pressable>

      <Text style={styles.label}>Duration (days)</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, duration <= 1 && { opacity: 0.4 }]}
          onPress={() => setDuration((d) => Math.max(1, d - 1))}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{duration}</Text>
        <Pressable style={styles.stepBtn} onPress={() => setDuration((d) => d + 1)}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Start Date</Text>
      <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
        <Text style={startDate ? styles.dateBtnValue : styles.dateBtnPlaceholder}>
          {startDate ? displayDate(startDate) : 'Select a date (optional)'}
        </Text>
        {startDate && (
          <Pressable onPress={() => setStartDate(null)}>
            <Text style={styles.dateClear}>✕</Text>
          </Pressable>
        )}
      </Pressable>

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={startDate ?? new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selected) setStartDate(selected);
          }}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <Pressable style={styles.pickerDone} onPress={() => setShowDatePicker(false)}>
          <Text style={styles.pickerDoneText}>Done</Text>
        </Pressable>
      )}

      <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Changes</Text>
        )}
      </Pressable>
    </ScrollView>
    </>
  );
}
