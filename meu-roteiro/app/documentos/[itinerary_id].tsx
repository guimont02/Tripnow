import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, type Colors } from '../../lib/theme';
import type { TripDocument } from '../../types';

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardIconText: { fontSize: 20 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 15, fontWeight: '600', color: colors.text },
    cardHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    empty: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 15,
      marginTop: 60,
      fontStyle: 'italic',
    },
    fab: {
      position: 'absolute',
      bottom: 28,
      right: 20,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 14,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}

function getFileIcon(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.pdf')) return '📄';
  if (lower.match(/\.(jpg|jpeg|png|gif|webp)/)) return '🖼️';
  return '📎';
}

export default function DocumentosScreen() {
  const { itinerary_id } = useLocalSearchParams<{ itinerary_id: string }>();
  const router = useRouter();
  const { colors, dark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        const { data } = await supabase
          .from('trip_documents')
          .select('*')
          .eq('itinerary_id', itinerary_id)
          .order('created_at', { ascending: false });
        setDocuments(data ?? []);
        setLoading(false);
      }
      load();
    }, [itinerary_id])
  );

  function confirmDelete(doc: TripDocument) {
    Alert.alert('Excluir Documento', `Deseja excluir "${doc.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('trip_documents').delete().eq('id', doc.id);
          if (error) {
            Alert.alert('Erro', 'Nao foi possivel excluir o documento.');
          } else {
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
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
          title: 'Documentos',
          headerRight: () => (
            <Pressable onPress={toggleTheme} style={{ marginRight: 4, padding: 4 }}>
              <Text style={{ fontSize: 18 }}>{dark ? '☀️' : '🌙'}</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum documento adicionado ainda.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => Linking.openURL(item.file_url)}
              onLongPress={() => confirmDelete(item)}
            >
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>{getFileIcon(item.file_url)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.cardHint}>Toque para abrir · Segure para excluir</Text>
              </View>
            </Pressable>
          )}
        />
        <Pressable
          style={styles.fab}
          onPress={() => router.push(`/documentos/novo?itinerary_id=${itinerary_id}`)}
        >
          <Text style={styles.fabText}>+ Documento</Text>
        </Pressable>
      </View>
    </>
  );
}
