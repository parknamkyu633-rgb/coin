import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { getListings, BASE_URL } from '../services/api';

export default function MarketScreen() {
  const [q, setQ] = useState('');
  const navigation = useNavigation<any>();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['listings', q],
    queryFn: () => getListings(q ? { q } : undefined),
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="코인 이름, 국가 검색..."
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => refetch()}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateListing')}>
          <Text style={styles.addBtnText}>+ 등록</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : !data?.length ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>등록된 매물이 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: any }) => {
            const thumb = Array.isArray(item.imageUrls) && item.imageUrls.length > 0
              ? item.imageUrls[0]
              : null;
            return (
              <View style={styles.item}>
                {thumb ? (
                  <Image
                    source={{ uri: thumb.startsWith('/') ? `${BASE_URL}${thumb}` : thumb }}
                    style={styles.thumb}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbIcon}>🪙</Text>
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={styles.price}>₩{item.price.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      listingId: item.id,
                      listingTitle: item.title,
                    })
                  }
                >
                  <Text style={styles.chatBtnText}>💬 채팅</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 16, gap: 8 },
  search: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
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
  thumb: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 28 },
  itemInfo: { flex: 1, marginRight: 12 },
  title: { fontWeight: '600', color: '#111', fontSize: 15 },
  desc: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  price: { fontWeight: '700', color: '#059669', fontSize: 16, marginTop: 4 },
  chatBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatBtnText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
});
