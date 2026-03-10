import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';

interface Mentor {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function MentorsScreen() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [activeMentor, setActiveMentor] = useState<{ id: string; mentorId: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMentors();
  }, []);

  async function loadMentors() {
    const { data } = await supabase.from('mentors').select('*');
    if (data) setMentors(data);
  }

  async function selectMentor(mentor: Mentor) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if already activated
    const { data: existing } = await supabase
      .from('user_mentors')
      .select('id')
      .eq('user_id', user.id)
      .eq('mentor_id', mentor.id)
      .limit(1);

    let userMentorId: string;
    if (existing && existing.length > 0) {
      userMentorId = existing[0].id;
    } else {
      const { data: created } = await supabase
        .from('user_mentors')
        .insert({ user_id: user.id, mentor_id: mentor.id })
        .select()
        .single();
      if (!created) return;
      userMentorId = created.id;
    }

    setActiveMentor({ id: userMentorId, mentorId: mentor.id, name: mentor.name });

    // Load chat history
    const { data: history } = await supabase
      .from('mentor_messages')
      .select('role, content')
      .eq('user_mentor_id', userMentorId)
      .order('created_at', { ascending: true });

    setMessages((history ?? []) as Message[]);
  }

  async function sendMessage() {
    if (!input.trim() || !activeMentor) return;
    const content = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setLoading(true);

    // Save user message
    await supabase.from('mentor_messages').insert({
      user_mentor_id: activeMentor.id,
      role: 'user',
      content,
    });

    // Call edge function or API for AI response
    // For now, use a placeholder that indicates the feature needs the edge function
    try {
      const { data, error } = await supabase.functions.invoke('mentor-chat', {
        body: { userMentorId: activeMentor.id, content },
      });

      if (data?.text) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.text }]);
        await supabase.from('mentor_messages').insert({
          user_mentor_id: activeMentor.id,
          role: 'assistant',
          content: data.text,
        });
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'I apologize, I was unable to respond. Please try again.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please try again.' },
      ]);
    }

    setLoading(false);
  }

  if (!activeMentor) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>AI Mentors</Text>
        <Text style={styles.subtitle}>Choose a mentor to guide your journey.</Text>
        {mentors.map((mentor) => (
          <TouchableOpacity
            key={mentor.id}
            style={styles.mentorCard}
            onPress={() => selectMentor(mentor)}
          >
            <Text style={styles.mentorName}>{mentor.name}</Text>
            <Text style={styles.mentorDesc}>{mentor.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.chatContainer}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setActiveMentor(null)}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle}>{activeMentor.name}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        style={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={item.role === 'user' ? styles.userText : styles.assistantText}>
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Start a conversation with your mentor.</Text>
        }
      />

      {loading && <Text style={styles.thinking}>Thinking...</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          editable={!loading}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  mentorCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, marginBottom: 12 },
  mentorName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  mentorDesc: { fontSize: 14, color: '#666' },
  chatContainer: { flex: 1, backgroundColor: '#fff' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  backButton: { color: '#4F46E5', fontSize: 16, marginRight: 16 },
  chatTitle: { fontSize: 18, fontWeight: '600' },
  messageList: { flex: 1, padding: 16 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#4F46E5' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6' },
  userText: { color: '#fff' },
  assistantText: { color: '#111' },
  emptyText: { textAlign: 'center', color: '#999', paddingVertical: 48 },
  thinking: { textAlign: 'center', color: '#999', paddingVertical: 8 },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#E5E7EB' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16 },
  sendButton: { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 16, marginLeft: 8, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
});
