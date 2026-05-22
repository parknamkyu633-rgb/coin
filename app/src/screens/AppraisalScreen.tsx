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
  Image,
  Modal,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Payment } from '@portone/react-native-sdk';
import type { PaymentResponse } from '@portone/browser-sdk/v2';
import { api } from '../services/api';

const STORE_ID = process.env.EXPO_PUBLIC_PORTONE_STORE_ID ?? '';
const CHANNEL_KEY = process.env.EXPO_PUBLIC_PORTONE_CHANNEL_KEY ?? '';

const TIERS = [
  { key: 'basic', label: '기본 감정', price: 5000, desc: 'AI + 전문가 확인, 3일 내 결과' },
  { key: 'premium', label: '정밀 감정', price: 15000, desc: '고해상도 분석 + 인증서 발급, 2일 내 결과' },
] as const;

type Tier = typeof TIERS[number]['key'];

type PaymentState = {
  appraisalId: string;
  paymentOrderId: string;
  price: number;
};

export default function AppraisalScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const scanId: string | undefined = route.params?.scanId;

  const [tier, setTier] = useState<Tier>('basic');
  const [condition, setCondition] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
  const [verifying, setVerifying] = useState(false);

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
    if (!CHANNEL_KEY) {
      Alert.alert('설정 오류', '결제 채널이 설정되지 않았습니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/appraisals', {
        tier,
        scanId,
        condition,
        note,
        imageUrls: images,
      });
      setPaymentState({
        appraisalId: res.data.appraisalId,
        paymentOrderId: res.data.paymentOrderId,
        price: res.data.price,
      });
    } catch {
      Alert.alert('오류', '의뢰 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async (response: PaymentResponse) => {
    if (!paymentState) return;
    if (response.code !== undefined) {
      // 결제 실패
      setPaymentState(null);
      Alert.alert('결제 실패', response.message ?? '결제가 취소됐습니다.');
      return;
    }

    setVerifying(true);
    try {
      await api.post(`/api/appraisals/${paymentState.appraisalId}/verify-payment`, {
        paymentId: response.paymentId,
      });
      setPaymentState(null);
      Alert.alert('접수 완료', '감정 의뢰가 접수됐습니다.\n결과는 영업일 기준 2~3일 내 알려드립니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch {
      setPaymentState(null);
      Alert.alert('검증 실패', '결제는 완료됐으나 검증에 실패했습니다. 고객센터에 문의하세요.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentError = (error: Error) => {
    setPaymentState(null);
    Alert.alert('결제 오류', error.message ?? '결제 중 오류가 발생했습니다.');
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>전문가 감정 의뢰</Text>

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

        <Text style={styles.label}>코인 상태</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 유통 상태, 마모 없음, 광택 양호"
          value={condition}
          onChangeText={setCondition}
          multiline
        />

        <Text style={styles.label}>추가 문의 (선택)</Text>
        <TextInput
          style={[styles.input, styles.inputTall]}
          placeholder="궁금한 점이나 특이 사항을 입력하세요"
          value={note}
          onChangeText={setNote}
          multiline
        />

        <Text style={styles.label}>추가 사진 ({images.length}장)</Text>
        {images.length > 0 && (
          <View style={styles.photoGrid}>
            {images.map((uri, i) => (
              <View key={i} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
              결제하고 의뢰 신청 ₩{selectedTier.price.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* 결제 모달 */}
      <Modal visible={!!paymentState} animationType="slide">
        <SafeAreaView style={styles.paymentModal}>
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentHeaderTitle}>결제</Text>
            <TouchableOpacity
              onPress={() => {
                setPaymentState(null);
              }}
              disabled={verifying}
            >
              <Text style={styles.paymentClose}>✕ 닫기</Text>
            </TouchableOpacity>
          </View>

          {verifying ? (
            <View style={styles.verifyingWrap}>
              <ActivityIndicator size="large" color="#f59e0b" />
              <Text style={styles.verifyingText}>결제 확인 중...</Text>
            </View>
          ) : paymentState ? (
            <Payment
              request={{
                storeId: STORE_ID,
                channelKey: CHANNEL_KEY,
                paymentId: paymentState.paymentOrderId,
                orderName: `헤리트코인 감정 의뢰 (${selectedTier.label})`,
                totalAmount: paymentState.price,
                currency: 'CURRENCY_KRW',
                payMethod: 'EASY_PAY',
              }}
              onComplete={handlePaymentComplete}
              onError={handlePaymentError}
              style={styles.paymentWebView}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </>
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
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 8 },
  photoRemove: {
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
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  paymentModal: { flex: 1, backgroundColor: '#fff' },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  paymentHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  paymentClose: { fontSize: 14, color: '#6b7280' },
  paymentWebView: { flex: 1 },
  verifyingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  verifyingText: { fontSize: 16, color: '#374151' },
});
