import { useCallback, useState } from 'react';
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
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, type Colors } from '../../lib/theme';
import type { Flight } from '../../types';

type ActivePicker = 'depDate' | 'depTime' | 'arrDate' | 'arrTime' | null;

function combineDatetime(date: Date, time: Date): string {
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined.toISOString();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 48 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    datetimeBtn: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    datetimeBtnValue: { fontSize: 16, color: colors.text, fontWeight: '600' },
    datetimeBtnPlaceholder: { fontSize: 16, color: colors.inputPlaceholder },
    pickerDone: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
    pickerDoneText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginTop: 28,
      marginBottom: 4,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    optionalTag: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
    clearBtn: { marginTop: 8, alignSelf: 'flex-start' },
    clearBtnText: { color: colors.danger, fontSize: 13 },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 32,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    deleteBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    deleteBtnText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  });
}

export default function EditarVooScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, dark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [locator, setLocator] = useState('');

  const [depDate, setDepDate] = useState<Date>(new Date());
  const [depTime, setDepTime] = useState<Date>(new Date());
  const [arrDate, setArrDate] = useState<Date | null>(null);
  const [arrTime, setArrTime] = useState<Date | null>(null);

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        const { data } = await supabase.from('flights').select('*').eq('id', id).single();
        if (data) {
          const flight = data as Flight;
          setAirline(flight.airline);
          setFlightNumber(flight.flight_number ?? '');
          setOrigin(flight.origin);
          setDestination(flight.destination);
          setLocator(flight.locator ?? '');
          const dep = new Date(flight.departure_datetime);
          setDepDate(dep);
          setDepTime(dep);
          if (flight.arrival_datetime) {
            const arr = new Date(flight.arrival_datetime);
            setArrDate(arr);
            setArrTime(arr);
          }
        }
        setLoading(false);
      }
      load();
    }, [id])
  );

  function handlePickerChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setActivePicker(null);
    if (!selected) return;
    if (activePicker === 'depDate') setDepDate(selected);
    else if (activePicker === 'depTime') setDepTime(selected);
    else if (activePicker === 'arrDate') setArrDate(selected);
    else if (activePicker === 'arrTime') setArrTime(selected);
  }

  function pickerMode(): 'date' | 'time' {
    return activePicker === 'depTime' || activePicker === 'arrTime' ? 'time' : 'date';
  }

  function pickerValue(): Date {
    if (activePicker === 'depDate') return depDate;
    if (activePicker === 'depTime') return depTime;
    if (activePicker === 'arrDate') return arrDate ?? new Date();
    if (activePicker === 'arrTime') return arrTime ?? new Date();
    return new Date();
  }

  async function handleSave() {
    if (!airline.trim()) return Alert.alert('Obrigatório', 'Informe a companhia aérea.');
    if (!origin.trim()) return Alert.alert('Obrigatório', 'Informe a origem.');
    if (!destination.trim()) return Alert.alert('Obrigatório', 'Informe o destino.');

    try {
      setSaving(true);
      const { error } = await supabase.from('flights').update({
        airline: airline.trim(),
        flight_number: flightNumber.trim() || null,
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        departure_datetime: combineDatetime(depDate, depTime),
        arrival_datetime: arrDate && arrTime ? combineDatetime(arrDate, arrTime) : null,
        locator: locator.trim().toUpperCase() || null,
      }).eq('id', id);
      if (error) throw error;
      router.back();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Excluir Voo', 'Tem certeza que deseja excluir este voo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('flights').delete().eq('id', id);
          if (error) {
            Alert.alert('Erro', 'Não foi possível excluir o voo.');
          } else {
            router.back();
          }
        },
      },
    ]);
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
      <Stack.Screen
        options={{
          title: '✈️ Editar Voo',
          headerRight: () => (
            <Pressable onPress={toggleTheme} style={{ marginRight: 4, padding: 4 }}>
              <Text style={{ fontSize: 18 }}>{dark ? '☀️' : '🌙'}</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Companhia Aérea *</Text>
        <TextInput
          style={styles.input}
          placeholder="ex: LATAM, GOL, Azul"
          placeholderTextColor={colors.inputPlaceholder}
          value={airline}
          onChangeText={setAirline}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Número do Voo</Text>
        <TextInput
          style={styles.input}
          placeholder="ex: LA3045"
          placeholderTextColor={colors.inputPlaceholder}
          value={flightNumber}
          onChangeText={(t) => setFlightNumber(t.toUpperCase())}
          autoCapitalize="characters"
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Origem *</Text>
            <TextInput
              style={styles.input}
              placeholder="GRU"
              placeholderTextColor={colors.inputPlaceholder}
              value={origin}
              onChangeText={(t) => setOrigin(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={4}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Destino *</Text>
            <TextInput
              style={styles.input}
              placeholder="LIS"
              placeholderTextColor={colors.inputPlaceholder}
              value={destination}
              onChangeText={(t) => setDestination(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={4}
            />
          </View>
        </View>

        <Text style={styles.label}>Localizador</Text>
        <TextInput
          style={styles.input}
          placeholder="ex: ABC123"
          placeholderTextColor={colors.inputPlaceholder}
          value={locator}
          onChangeText={(t) => setLocator(t.toUpperCase())}
          autoCapitalize="characters"
        />

        <Text style={styles.sectionTitle}>✈️ Partida *</Text>
        <View style={styles.divider} />

        <Text style={styles.label}>Data</Text>
        <Pressable style={styles.datetimeBtn} onPress={() => setActivePicker('depDate')}>
          <Text style={styles.datetimeBtnValue}>{formatDate(depDate)}</Text>
        </Pressable>

        <Text style={styles.label}>Horário</Text>
        <Pressable style={styles.datetimeBtn} onPress={() => setActivePicker('depTime')}>
          <Text style={styles.datetimeBtnValue}>{formatTime(depTime)}</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 4 }}>
          <Text style={styles.sectionTitle}>🛬 Chegada</Text>
          <Text style={styles.optionalTag}>opcional</Text>
        </View>
        <View style={styles.divider} />

        <Text style={styles.label}>Data</Text>
        <Pressable style={styles.datetimeBtn} onPress={() => setActivePicker('arrDate')}>
          <Text style={arrDate ? styles.datetimeBtnValue : styles.datetimeBtnPlaceholder}>
            {arrDate ? formatDate(arrDate) : 'Selecionar data'}
          </Text>
        </Pressable>

        {arrDate && (
          <>
            <Text style={styles.label}>Horário</Text>
            <Pressable style={styles.datetimeBtn} onPress={() => setActivePicker('arrTime')}>
              <Text style={arrTime ? styles.datetimeBtnValue : styles.datetimeBtnPlaceholder}>
                {arrTime ? formatTime(arrTime) : 'Selecionar horário'}
              </Text>
            </Pressable>
            <Pressable style={styles.clearBtn} onPress={() => { setArrDate(null); setArrTime(null); }}>
              <Text style={styles.clearBtnText}>Remover chegada</Text>
            </Pressable>
          </>
        )}

        {activePicker && (
          <DateTimePicker
            mode={pickerMode()}
            value={pickerValue()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handlePickerChange}
          />
        )}
        {activePicker && Platform.OS === 'ios' && (
          <Pressable style={styles.pickerDone} onPress={() => setActivePicker(null)}>
            <Text style={styles.pickerDoneText}>Pronto</Text>
          </Pressable>
        )}

        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar Alterações</Text>}
        </Pressable>

        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteBtnText}>Excluir Voo</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
