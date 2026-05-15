import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { createListing, uploadImages } from '../services/api';

const MAX_IMAGES = 5;

export default function CreateListingScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      return Alert.alert('최대 5장까지 첨부 가능합니다.');
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다. 설정에서 허용해주세요.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (result.canceled) return;
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
    } catch (e: any) {
      console.error('pickImages error:', e);
      Alert.alert('오류', e?.message ?? String(e));
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((u) => u !== uri));
  };

  const submit = async () => {
    if (!title.trim()) return Alert.alert('오류', '제목을 입력해주세요.');
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) return Alert.alert('오류', '올바른 가격을 입력해주세요.');

    setLoading(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages(images);
      }
      await createListing({
        title: title.trim(),
        price: priceNum,
        description: description.trim(),
        imageUrls,
      });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      Alert.alert('완료', '매물이 등록되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('실패', e?.response?.data?.error ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* 사진 첨부 */}
        <Text style={styles.label}>사진 ({images.length}/{MAX_IMAGES})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
          {/* 추가 버튼 */}
          {images.length < MAX_IMAGES && (
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
              <Text style={styles.addImageIcon}>+</Text>
              <Text style={styles.addImageText}>사진 추가</Text>
            </TouchableOpacity>
          )}
          {/* 미리보기 */}
          {images.map((uri) => (
            <View key={uri} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(uri)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.label}>제목 *</Text>
        <TextInput
          style={styles.input}
          placeholder="예) 1970년 미국 페니 동전"
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />

        <Text style={styles.label}>가격 (원) *</Text>
        <TextInput
          style={styles.input}
          placeholder="예) 15000"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="상태, 특이사항 등을 적어주세요."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>매물 등록</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  imageRow: { flexDirection: 'row', marginBottom: 4 },
  addImageBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  addImageIcon: { fontSize: 24, color: '#9ca3af' },
  addImageText: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  imageWrapper: { position: 'relative', marginRight: 10 },
  thumbnail: { width: 90, height: 90, borderRadius: 10 },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
  },
  textarea: { height: 120, paddingTop: 12 },
  submitBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
