import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, type Colors } from '../../lib/theme';
import type { Activity } from '../../types';

const PRICE_OPTIONS = ['$', '$$', '$$$', '$$$$'];

const CULINARY_TYPES = [
  'Italian', 'Japanese', 'French', 'Mexican', 'Brazilian',
  'Chinese', 'Indian', 'Mediterranean', 'American', 'Thai',
  'Spanish', 'Greek', 'Lebanese', 'Other',
];

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function parseTime(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: colors.textMuted, fontSize: 15 },
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
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    timeBtn: {
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
    timeBtnValue: { fontSize: 16, color: colors.text, fontWeight: '600' },
    timeBtnPlaceholder: { fontSize: 16, color: colors.inputPlaceholder },
    timeClear: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 4 },
    pickerDone: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
    pickerDoneText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 14, color: colors.textSecondary },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    priceRow: { flexDirection: 'row', gap: 12 },
    priceBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderInput,
      alignItems: 'center',
    },
    priceBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    priceBtnText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
    priceBtnTextActive: { color: '#fff' },
    existingPdf: {
      backgroundColor: colors.primaryLight,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
      alignSelf: 'flex-start',
    },
    existingPdfText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    pdfBtn: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.borderInput,
      borderStyle: 'dashed',
    },
    pdfBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
    pdfRemove: { color: colors.danger, fontSize: 13, marginTop: 6 },
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

export default function EditAtividadeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, dark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [culinaryType, setCulinaryType] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchActivity() {
      const { data } = await supabase.from('activities').select('*').eq('id', id).single();
      if (data) {
        setActivity(data);
        setTitle(data.title ?? '');
        setLocation(data.location ?? '');
        setCulinaryType(data.culinary_type ?? '');
        setEstimatedPrice(data.estimated_price ?? '');
        setNotes(data.notes ?? '');
        setExistingPdfUrl(data.pdf_url ?? null);
        if (data.time) setTime(parseTime(data.time));
      }
      setLoading(false);
    }
    fetchActivity();
  }, [id]);

  const isRestaurant = activity?.type === 'restaurant';
  const isAttraction = activity?.type === 'attraction';
  const hasLocation = activity?.type === 'restaurant' || activity?.type === 'place' || activity?.type === 'attraction';

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPdfUri(result.assets[0].uri);
      setPdfName(result.assets[0].name);
      setExistingPdfUrl(null);
    }
  }

  async function uploadPdf(): Promise<string | null> {
    if (!pdfUri) return existingPdfUrl;
    const response = await fetch(pdfUri);
    const arrayBuffer = await response.arrayBuffer();
    const filename = `${activity?.itinerary_id}_${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('receipts').upload(filename, arrayBuffer, {
      contentType: 'application/pdf',
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('receipts').getPublicUrl(filename);
    return data.publicUrl;
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    try {
      setSaving(true);
      const pdfUrl = await uploadPdf();
      const { error } = await supabase.from('activities').update({
        title: title.trim(),
        notes: notes.trim() || null,
        location: location.trim() || null,
        culinary_type: culinaryType || null,
        estimated_price: estimatedPrice || null,
        time: time ? formatTime(time) : null,
        pdf_url: pdfUrl,
      }).eq('id', id);

      if (error) throw new Error(error.message);
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Error', msg);
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

  if (!activity) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Activity not found.</Text>
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
      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholderTextColor={colors.inputPlaceholder}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Time</Text>
      <Pressable style={styles.timeBtn} onPress={() => setShowPicker(true)}>
        <Text style={time ? styles.timeBtnValue : styles.timeBtnPlaceholder}>
          {time ? formatTime(time) : 'Set a time (optional)'}
        </Text>
        {time && (
          <Pressable onPress={() => setTime(null)}>
            <Text style={styles.timeClear}>✕</Text>
          </Pressable>
        )}
      </Pressable>
      {showPicker && (
        <DateTimePicker
          mode="time"
          value={time ?? new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowPicker(Platform.OS === 'ios');
            if (selected) setTime(selected);
          }}
        />
      )}
      {showPicker && Platform.OS === 'ios' && (
        <Pressable style={styles.pickerDone} onPress={() => setShowPicker(false)}>
          <Text style={styles.pickerDoneText}>Done</Text>
        </Pressable>
      )}

      {hasLocation && (
        <>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste Google Maps link or address"
            placeholderTextColor={colors.inputPlaceholder}
            value={location}
            onChangeText={setLocation}
            autoCapitalize="none"
            keyboardType="url"
          />
        </>
      )}

      {isRestaurant && (
        <>
          <Text style={styles.label}>Type of Cuisine</Text>
          <View style={styles.chipGrid}>
            {CULINARY_TYPES.map((cuisine) => (
              <Pressable
                key={cuisine}
                style={[styles.chip, culinaryType === cuisine && styles.chipActive]}
                onPress={() => setCulinaryType(culinaryType === cuisine ? '' : cuisine)}
              >
                <Text style={[styles.chipText, culinaryType === cuisine && styles.chipTextActive]}>
                  {cuisine}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Estimated Price</Text>
          <View style={styles.priceRow}>
            {PRICE_OPTIONS.map((price) => (
              <Pressable
                key={price}
                style={[styles.priceBtn, estimatedPrice === price && styles.priceBtnActive]}
                onPress={() => setEstimatedPrice(estimatedPrice === price ? '' : price)}
              >
                <Text style={[styles.priceBtnText, estimatedPrice === price && styles.priceBtnTextActive]}>
                  {price}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {isAttraction && (
        <>
          <Text style={styles.label}>Receipt / Ticket (PDF)</Text>
          {existingPdfUrl && !pdfUri && (
            <Pressable style={styles.existingPdf} onPress={() => Linking.openURL(existingPdfUrl)}>
              <Text style={styles.existingPdfText}>📄 View current PDF</Text>
            </Pressable>
          )}
          <Pressable style={styles.pdfBtn} onPress={pickPdf}>
            <Text style={styles.pdfBtnText}>
              {pdfName ? `📄 ${pdfName}` : existingPdfUrl ? 'Replace PDF' : '+ Upload PDF'}
            </Text>
          </Pressable>
          {(pdfUri || existingPdfUrl) && (
            <Pressable onPress={() => { setPdfUri(null); setPdfName(null); setExistingPdfUrl(null); }}>
              <Text style={styles.pdfRemove}>Remove file</Text>
            </Pressable>
          )}
        </>
      )}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Any extra details..."
        placeholderTextColor={colors.inputPlaceholder}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

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
