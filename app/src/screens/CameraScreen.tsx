import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useScanStore } from '../store/scanStore';
import { scanCoin } from '../services/api';

type Step = 'front' | 'back';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('front');
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { frontUri, setFront, setBack, setResult, reset } = useScanStore();
  const navigation = useNavigation<any>();

  useFocusEffect(React.useCallback(() => {
    setStep('front');
    reset();
  }, []));

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>카메라 접근 권한이 필요합니다</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>권한 허용</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (!photo) return;

    if (step === 'front') {
      setFront(photo.uri);
      setStep('back');
    } else {
      setBack(photo.uri);
      await analyze(photo.uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 0.9,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    if (step === 'front') {
      setFront(uri);
      setStep('back');
    } else {
      setBack(uri);
      await analyze(uri);
    }
  };

  const skipBack = async () => {
    await analyze();
  };

  const analyze = async (backUriOverride?: string) => {
    if (!frontUri) return;
    setLoading(true);
    try {
      const data = await scanCoin(frontUri, backUriOverride);
      setResult(data.scanId, data.result);
      navigation.navigate('Result');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? '알 수 없는 오류';
      const url = e?.config?.url ?? '';
      Alert.alert('분석 실패', `${msg}\n${url}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" animateShutter={false} />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.circle} />
        <Text style={styles.guide}>
          {step === 'front' ? '동전 앞면을 원 안에 맞춰주세요' : '동전 뒷면을 촬영하세요'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.iconBtn} onPress={pickFromGallery}>
          <Text style={styles.iconText}>갤러리</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureBtn} onPress={capture} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <View style={styles.captureDot} />}
        </TouchableOpacity>

        {step === 'back' && (
          <TouchableOpacity style={styles.iconBtn} onPress={skipBack} disabled={loading}>
            <Text style={styles.iconText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
        {step === 'front' && <View style={styles.iconBtn} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'transparent',
  },
  guide: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 24,
    backgroundColor: '#111',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
  },
  iconBtn: {
    width: 72,
    alignItems: 'center',
  },
  iconText: { color: '#fff', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  permText: { color: '#fff', marginBottom: 16 },
  btn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#000', fontWeight: '700' },
});
