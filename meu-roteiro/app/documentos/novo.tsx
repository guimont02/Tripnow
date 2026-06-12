import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, type Colors } from '../../lib/theme';

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    fileBtn: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.borderInput,
      borderStyle: 'dashed',
    },
    fileBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
    fileSelected: { fontSize: 15, color: colors.text },
    fileClear: { color: colors.danger, fontSize: 13, marginTop: 6 },
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

export default function NovoDocumentoScreen() {
  const router = useRouter();
  const { itinerary_id } = useLocalSearchParams<{ itinerary_id: string }>();
  const { colors, dark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [name, setName] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setFileUri(result.assets[0].uri);
      setFileName(result.assets[0].name);
      setFileMime(result.assets[0].mimeType ?? 'application/octet-stream');
      if (!name.trim()) {
        setName(result.assets[0].name.replace(/\.[^.]+$/, ''));
      }
    }
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Obrigatorio', 'Informe um nome para o documento.');
    if (!fileUri) return Alert.alert('Obrigatorio', 'Selecione um arquivo.');

    try {
      setSaving(true);
      const ext = fileName?.split('.').pop() ?? 'bin';
      const storagePath = `docs/${itinerary_id}_${Date.now()}.${ext}`;
      console.log('[documentos/novo] uploading:', storagePath, 'mime:', fileMime);

      const response = await fetch(fileUri);
      const arrayBuffer = await response.arrayBuffer();
      console.log('[documentos/novo] arrayBuffer size:', arrayBuffer.byteLength);

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(storagePath, arrayBuffer, { contentType: fileMime ?? 'application/octet-stream' });
      console.log('[documentos/novo] uploadError:', JSON.stringify(uploadError));
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
      console.log('[documentos/novo] publicUrl:', urlData.publicUrl);

      const { data: dbData, error: dbError } = await supabase.from('trip_documents').insert({
        itinerary_id,
        name: name.trim(),
        file_url: urlData.publicUrl,
      }).select();
      console.log('[documentos/novo] dbData:', JSON.stringify(dbData));
      console.log('[documentos/novo] dbError:', JSON.stringify(dbError));
      if (dbError) throw dbError;

      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      console.log('[documentos/novo] catch:', msg);
      Alert.alert('Erro', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Novo Documento',
          headerRight: () => (
            <Pressable onPress={toggleTheme} style={{ marginRight: 4, padding: 4 }}>
              <Text style={{ fontSize: 18 }}>{dark ? '☀️' : '🌙'}</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="ex: Reserva Hotel, Contrato Carro"
          placeholderTextColor={colors.inputPlaceholder}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Arquivo *</Text>
        <Pressable style={styles.fileBtn} onPress={pickFile}>
          <Text style={fileUri ? styles.fileSelected : styles.fileBtnText} numberOfLines={1}>
            {fileName ?? '+ Selecionar arquivo'}
          </Text>
        </Pressable>
        {fileUri && (
          <Pressable onPress={() => { setFileUri(null); setFileName(null); setFileMime(null); }}>
            <Text style={styles.fileClear}>Remover arquivo</Text>
          </Pressable>
        )}

        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar Documento</Text>}
        </Pressable>
      </ScrollView>
    </>
  );
}
