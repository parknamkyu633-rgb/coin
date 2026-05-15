import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Payment, type PortOneController } from '@portone/react-native-sdk';
import type { PaymentRequest, PaymentResponse } from '@portone/browser-sdk/v2';
import { useRef } from 'react';
import { api } from '../services/api';

const TIERS = [
  { key: 'basic', label: '기본 감정', price: 5000, desc: 'AI + 전문가 확인, 3일 내 결과' },
  { key: 'premium', label: '정밀 감정', price: 15000, desc: '고해상도 분석 + 인증서 발급, 2일 내 결과' },
] as const;

type Tier = typeof TIERS[number]['key'];

export default function AppraisalScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const scanId: string | undefined = route.params?.scanId;

  const [tier, setTier] = useState<Tier>('basic');
  const [condition, setCondition] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [appraisalId, setAppraisalId] = useState('');
  const [loading, setLoading] = useState(false);

  const paymentRef = useRef<PortOneController>(null);

  const selectedTier = TIERS.find((t) => t.key === tier)!;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/appraisals', {
        tier,
        scanId,
        condition,
        note,
        imageUrls: images,
      });
      setAppraisalId(data.appraisalId);
      setStep('payment');
    } catch {
      Alert.alert('오류', '의뢰 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentDone = async (paymentId: string) => {
    try {
      await api.post(`/api/appraisals/${appraisalId}/verify-payment`, { paymentId });
      Alert.alert('결제 완료', '감정 의뢰가 접수됐습니다. 결과는 알림으로 안내됩니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('검증 실패', '결제 검증에 실패했습니다. 고객센터에 문의해주세요.');
    }
  };

  const handlePaymentComplete = (response: PaymentResponse) => {
    if (response.code) {
      Alert.alert('결제 실패', response.message ?? '결제가 취소됐습니다.');
      return;
    }
    handlePaymentDone(response.paymentId);
  };

  if (step === 'payment') {
    const storeId = process.env.EXPO_PUBLIC_PORTONE_STORE_ID ?? '';
    const channelKey = process.env.EXPO_PUBLIC_PORTONE_CHANNEL_KEY ?? '';
    const paymentId = `appraisal-${appraisalId}-${Date.now()}`;
    const paymentRequest = {
      storeId,
      channelKey,
      paymentId,
      orderName: selectedTier.label,
      totalAmount: selectedTier.price,
      currency: 'KRW',
      payMethod: 'CARD',
    } as PaymentRequest;

    return (
      <View style={{ flex: 1 }}>
        <Payment
          ref={paymentRef}
          request={paymentRequest}
          onComplete={handlePaymentComplete}
          onError={(error) => Alert.alert('결제 실패', error.message)}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>전문가 감정 의뢰</Text>

      {/* 등급 선택 */}
      <Text style={styles.label}>감정 등급</Text>
      <View style={styles.tierRow}>
        {TIERS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tierCard, tier === t.key && styles.tierCardSelected]}
            onPress={() => setTier(t.key)}
          >
            <Text style={[styles.tierName, tier === t.key && styles.tierNameSelected]}>
              {t.label}
            </Text>
            <Text style={styles.tierPrice}>₩{t.price.toLocaleString()}</Text>
            <Text style={styles.tierDesc}>{t.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 상태 설명 */}
      <Text style={styles.label}>코인 상태</Text>
      <TextInput
        style={styles.input}
        placeholder="예: 유통 상태, 마모 없음, 광택 양호"
        value={condition}
        onChangeText={setCondition}
        multiline
      />

      {/* 추가 문의 */}
      <Text style={styles.label}>추가 문의 (선택)</Text>
      <TextInput
        style={[styles.input, styles.inputTall]}
        placeholder="궁금한 점이나 특이 사항을 입력하세요"
        value={note}
        onChangeText={setNote}
        multiline
      />

      {/* 추가 사진 */}
      <Text style={styles.label}>추가 사진 ({images.length}장)</Text>
      <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
        <Text style={styles.photoBtnText}>+ 사진 추가</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>
            결제하기 ₩{selectedTier.price.toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20, color: '#111' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  tierRow: { flexDirection: 'row', gap: 12 },
  tierCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
  },
  tierCardSelected: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  tierName: { fontWeight: '700', fontSize: 15, color: '#374151' },
  tierNameSelected: { color: '#d97706' },
  tierPrice: { fontSize: 18, fontWeight: '800', color: '#111', marginTop: 4 },
  tierDesc: { fontSize: 11, color: '#9ca3af', marginTop: 6, lineHeight: 16 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 14,
    color: '#111',
    minHeight: 48,
  },
  inputTall: { minHeight: 80, textAlignVertical: 'top' },
  photoBtn: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  photoBtnText: { color: '#6b7280', fontSize: 14 },
  submitBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
