import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { getScans, deleteScan } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { useScanStore } from '../store/scanStore';

const RARITY_COLOR: Record<string, string> = {
  common: '#6b7280',
  uncommon: '#10b981',
  rare: '#3b82f6',
  very_rare: '#f59e0b',
};

export default function CollectionScreen() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['scans'], queryFn: getScans });
  const { setResult } = useScanStore();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  useFocusEffect(React.useCallback(() => { refetch(); }, []));

  const handleDelete = (id: string, name: string) => {
    Alert.alert('삭제', `"${name ?? '이 항목'}"을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteScan(id);
            queryClient.invalidateQueries({ queryKey: ['scans'] });
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>아직 스캔한 코인이 없습니다</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('ScanTab', { screen: 'Camera' })}
        >
          <Text style={styles.btnText}>첫 코인 스캔하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item: any) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            const result = typeof item.result === 'string' ? JSON.parse(item.result) : item.result;
            setResult(item.id, result);
            navigation.navigate('ScanTab', { screen: 'Result' });
          }}
          onLongPress={() => handleDelete(item.id, item.coinName)}
          delayLongPress={500}
        >
          <View style={styles.itemLeft}>
            <View
              style={[
                styles.dot,
                { backgroundColor: RARITY_COLOR[item.rarity] ?? '#6b7280' },
              ]}
            />
            <View>
              <Text style={styles.name}>{item.coinName ?? '알 수 없음'}</Text>
              <Text style={styles.meta}>
                {item.country} · {item.year}
              </Text>
            </View>
          </View>
          <View style={styles.itemRight}>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('ko-KR')}
            </Text>
            <Text style={styles.deleteHint}>길게 눌러 삭제</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af', marginBottom: 16 },
  btn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  list: { padding: 16 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontWeight: '600', color: '#111', fontSize: 15 },
  meta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  date: { color: '#d1d5db', fontSize: 12 },
  deleteHint: { color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: '600' },
});
