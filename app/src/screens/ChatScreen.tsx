import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';
import { getOrCreateDeviceId } from '../services/device';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Msg {
  id: string;
  senderDeviceId: string;
  text: string;
  createdAt: string;
}

export default function ChatScreen() {
  const route = useRoute<any>();
  const { listingId, listingTitle } = route.params as {
    listingId: string;
    listingTitle: string;
  };

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let socket: Socket;

    const init = async () => {
      const did = await getOrCreateDeviceId();
      setDeviceId(did);

      // 채팅방 생성 또는 조회
      const { data: roomData } = await api.post('/api/chat/rooms', { listingId });
      const rid: string = roomData.roomId;
      setRoomId(rid);

      // 이전 메시지 로드
      const { data: history } = await api.get(`/api/chat/rooms/${rid}/messages`);
      setMessages(history);
      setLoading(false);

      // Socket.IO 연결
      socket = io(API_URL, {
        auth: { deviceId: did },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.emit('join_room', rid);

      socket.on('new_message', (msg: Msg) => {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      });
    };

    init();

    return () => {
      socketRef.current?.emit('leave_room', roomId);
      socketRef.current?.disconnect();
    };
  }, [listingId]);

  const sendMessage = useCallback(() => {
    if (!text.trim() || !socketRef.current || !roomId) return;
    socketRef.current.emit('send_message', { roomId, text: text.trim() });
    setText('');
  }, [text, roomId]);

  const renderItem = ({ item }: { item: Msg }) => {
    const isMe = item.senderDeviceId === deviceId;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>첫 메시지를 보내보세요</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="메시지 입력..."
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: '#9ca3af', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#f59e0b',
    borderBottomRightRadius: 4,
  },
  bubbleThem: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: '#111' },
  bubbleTextMe: { color: '#fff' },
  time: { fontSize: 10, color: '#9ca3af', marginTop: 4, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: { backgroundColor: '#d1d5db' },
  sendBtnText: { color: '#fff', fontWeight: '700' },
});
