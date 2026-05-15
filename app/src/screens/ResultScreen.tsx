import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useScanStore } from '../store/scanStore';

const RARITY_COLOR: Record<string, string> = {
  common: '#6b7280',
  uncommon: '#10b981',
  rare: '#3b82f6',
  very_rare: '#f59e0b',
};

const RARITY_LABEL: Record<string, string> = {
  common: '일반',
  uncommon: '비일반',
  rare: '희귀',
  very_rare: '매우 희귀',
};

export default function ResultScreen() {
  const { result, frontUri, scanId, reset } = useScanStore();
  const navigation = useNavigation<any>();

  const handleAppraisal = () => {
    navigation.navigate('Appraisal', { scanId });
  };

  if (!result) return null;

  const rarityColor = RARITY_COLOR[result.rarity] ?? '#6b7280';
  const confidencePercent = Math.round(Number(result.confidence) * 100);
  const variants = Array.isArray(result.variants) ? result.variants : [];
  const valMin = result.estimatedValue?.min ?? 0;
  const valMax = result.estimatedValue?.max ?? 0;

  const handleScanAgain = () => {
    reset();
    navigation.navigate('Camera');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {frontUri && <Image source={{ uri: frontUri }} style={styles.coinImage} />}

      {/* 신뢰도 경고 */}
      {result.confidence < 0.6 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            식별 신뢰도가 낮습니다. 전문가 감정을 권장합니다.
          </Text>
        </View>
      )}

      {/* 메인 카드 */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.coinName}>{result.name}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
            <Text style={styles.rarityText}>{RARITY_LABEL[result.rarity]}</Text>
          </View>
        </View>
        <Text style={styles.sub}>
          {result.country} · {result.year}
        </Text>
        <Text style={styles.confidence}>식별 신뢰도 {confidencePercent}%</Text>
      </View>

      {/* 상세 정보 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>상세 정보</Text>
        <InfoRow label="재질" value={result.material} />
        <InfoRow label="무게" value={result.weight} />
        <InfoRow label="지름" value={result.diameter} />
      </View>

      {/* 시장 가치 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>예상 시장 가치</Text>
        <Text style={styles.priceRange}>
          ₩{valMin.toLocaleString()} ~ ₩{valMax.toLocaleString()}
        </Text>
      </View>

      {/* 변종 */}
      {variants.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>변종</Text>
          <View style={styles.tagRow}>
            {variants.map((v, i) => (
              <View key={`${v}-${i}`} style={styles.tag}>
                <Text style={styles.tagText}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 역사적 의의 */}
      {result.historicalNote && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>역사적 의의</Text>
          <Text style={styles.historyText}>{result.historicalNote}</Text>
        </View>
      )}

      {/* 액션 버튼 */}
      <TouchableOpacity style={styles.primaryBtn} onPress={handleAppraisal}>
        <Text style={styles.primaryBtnText}>전문가 감정 의뢰</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleScanAgain}>
        <Text style={styles.secondaryBtnText}>새 코인 스캔</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  coinImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#e5e7eb',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: { color: '#92400e', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coinName: { fontSize: 20, fontWeight: '700', color: '#111', flex: 1 },
  rarityBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  rarityText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sub: { color: '#6b7280', marginTop: 4 },
  confidence: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { color: '#6b7280', fontSize: 14 },
  infoValue: { color: '#111', fontSize: 14, fontWeight: '500' },
  priceRange: { fontSize: 22, fontWeight: '700', color: '#059669' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#1d4ed8', fontSize: 13 },
  historyText: { color: '#374151', lineHeight: 22 },
  primaryBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 16 },
});
