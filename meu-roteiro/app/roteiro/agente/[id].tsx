import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { sendMessage, extractPlan, type ChatMessage } from '../../../lib/ai';
import { useTheme, type Colors } from '../../../lib/theme';
import type { Activity, Itinerary } from '../../../types';

function buildSystemPrompt(itinerary: Itinerary, activities: Activity[]): string {
  const cities = itinerary.cities?.join(', ') || 'not specified';
  const startDate = itinerary.start_date
    ? new Date(itinerary.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'not specified';

  const hasActivities = activities.length > 0;

  const existingSummary = hasActivities
    ? activities
        .sort((a, b) => a.day - b.day)
        .map((a) => `- Day ${a.day} | ${a.type} | ${a.title}${a.time ? ` at ${a.time.slice(0, 5)}` : ''}`)
        .join('\n')
    : '';

  const planningSection = hasActivities
    ? `The trip already has ${activities.length} activities planned:
${existingSummary}

Your role is to IMPROVE and ENHANCE this existing plan. Do NOT ask the initial 3 setup questions.
Instead, greet the user, briefly summarize what's already planned, and ask what they'd like to improve, add, or change (e.g. more restaurants, better activities for a specific day, adjust timing, etc.).
When generating additions or replacements, only output activities that are NEW or CHANGED — not the full plan again.`
    : `Your goal is to create a personalized day-by-day itinerary through a short conversation.

Ask the user 3 questions ONE AT A TIME:
1. What kind of food do they enjoy?
2. What type of activities (museums, outdoors, shopping, nightlife, etc.)?
3. What is their budget level (budget, mid-range, or luxury)?

After getting all 3 answers, tell them you're generating the plan.`;

  return `You are a friendly travel planning assistant helping plan a trip.

Trip details:
- Country: ${itinerary.country}
- Cities: ${cities}
- Duration: ${itinerary.duration} days
- Start date: ${startDate}

${planningSection}

When outputting activities, use this exact format:

<<<PLAN>>>
[JSON array]
<<<END>>>

The JSON must be an array of objects with this structure:
{
  "day": number (1 to ${itinerary.duration}),
  "type": "restaurant" | "place" | "attraction",
  "title": "name",
  "time": "HH:MM",
  "culinary_type": "cuisine" (restaurants only, otherwise omit),
  "estimated_price": "$" | "$$" | "$$$" | "$$$$" (restaurants only, otherwise omit),
  "notes": "one sentence description"
}

Include per day: 2 restaurants, 2 places, 1-2 attractions. Use realistic times.
Keep your messages short and conversational.`;
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    messageList: { padding: 16, gap: 12, paddingBottom: 8 },
    bubbleAgent: {
      maxWidth: '80%',
      borderRadius: 16,
      padding: 12,
      marginBottom: 4,
      backgroundColor: colors.surface,
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    bubbleUser: {
      maxWidth: '80%',
      borderRadius: 16,
      padding: 12,
      marginBottom: 4,
      backgroundColor: '#3B82F6',
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
    },
    agentLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bubbleTextAgent: { fontSize: 15, color: colors.text, lineHeight: 22 },
    bubbleTextUser: { fontSize: 15, color: '#fff', lineHeight: 22 },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    typingText: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      gap: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      maxHeight: 100,
    },
    sendBtn: {
      backgroundColor: '#3B82F6',
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    successBanner: {
      backgroundColor: colors.primaryLight,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary + '40',
      paddingHorizontal: 20,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    successText: { fontSize: 14, fontWeight: '600', color: colors.text },
    successBtn: { fontSize: 14, fontWeight: '700', color: colors.primary },
  });
}

export default function AgenteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, dark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    async function init() {
      const [{ data: itin }, { data: acts }] = await Promise.all([
        supabase.from('itineraries').select('*').eq('id', id).single(),
        supabase.from('activities').select('*').eq('itinerary_id', id),
      ]);
      if (!itin) return;
      setItinerary(itin);
      setActivities(acts ?? []);

      setLoading(true);
      try {
        const seed: ChatMessage = { role: 'user', content: 'Hello!' };
        const greeting = await sendMessage([seed], buildSystemPrompt(itin, acts ?? []));
        setMessages([{ role: 'assistant', content: greeting }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('Error', msg);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  async function handleSend() {
    if (!input.trim() || loading || !itinerary) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendMessage(updatedMessages, buildSystemPrompt(itinerary, activities));
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);

      const plan = extractPlan(reply);
      if (plan) await savePlan(plan);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function savePlan(planJson: string) {
    try {
      setSaving(true);
      const acts = JSON.parse(planJson);
      const rows = acts.map((a: Record<string, unknown>) => ({
        itinerary_id: id,
        day: a.day,
        type: a.type,
        title: a.title,
        time: a.time ?? null,
        culinary_type: a.culinary_type ?? null,
        estimated_price: a.estimated_price ?? null,
        notes: a.notes ?? null,
      }));

      const { error } = await supabase.from('activities').insert(rows);
      if (error) throw error;
      setPlanSaved(true);
    } catch {
      Alert.alert('Error', 'Failed to save the generated plan.');
    } finally {
      setSaving(false);
    }
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user';
    const displayText = item.content.replace(/<<<PLAN>>>[\s\S]*?<<<END>>>/g, '').trim();
    if (!displayText) return null;

    return (
      <View style={isUser ? styles.bubbleUser : styles.bubbleAgent}>
        {!isUser && <Text style={styles.agentLabel}>✈️ Travel Agent</Text>}
        <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAgent}>
          {displayText}
        </Text>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {planSaved && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✅ Your itinerary has been saved!</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.successBtn}>View Trip →</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {(loading || saving) && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.typingText}>
            {saving ? 'Saving your itinerary...' : 'Thinking...'}
          </Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your answer..."
          placeholderTextColor={colors.inputPlaceholder}
          multiline
          editable={!loading && !planSaved}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading || planSaved) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!input.trim() || loading || planSaved}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </>
  );
}
