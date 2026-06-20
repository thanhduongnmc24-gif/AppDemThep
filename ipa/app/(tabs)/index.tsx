import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const WORKSPACE_HEIGHT = SCREEN_HEIGHT * 0.55;

const SERVER_URL_KEY = 'SERVER_URL';
const MIN_CONF_KEY = 'MIN_CONF';
const ALERT_CONF_KEY = 'ALERT_CONF';

const DEFAULT_SERVER_URL = 'https://byvn.net/demthep';
const DEFAULT_MIN_CONF = '0.6';
const DEFAULT_ALERT_CONF = '0.7';

type HistoryItem = {
  id: string;
  originalImage: string;
  processedImage?: string;
  count: number;
  date: string;
};

type BatchItem = {
  id: string;
  originalImage: string;
  processedImage: string | null;
  count: number | null;
  resultImages: { v1: string | null; v2: string | null; v3: string | null };
  status: 'loading' | 'success' | 'error' | 'idle';
  processingTime: number | null;
};

function SteelImageViewer({ imageUri, resetTrigger }: { imageUri: string; resetTrigger: string | undefined }) {
  const [viewerKey, setViewerKey] = useState(0);
  const lastTap = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setViewerKey(prev => prev + 1);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });
  }, [imageUri, resetTrigger]);

  const resetZoom = () => {
    setViewerKey(prev => prev + 1);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      resetZoom();
    }
    lastTap.current = now;
  };

  return (
    <ScrollView
      key={viewerKey}
      ref={scrollRef}
      maximumZoomScale={5}
      minimumZoomScale={1}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      centerContent={true}
      bounces={false}
      bouncesZoom={false}
      alwaysBounceVertical={false}
      alwaysBounceHorizontal={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      style={styles.viewerScroll}
      contentContainerStyle={styles.viewerContainer}
    >
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <Image
          key={`${resetTrigger || 'image'}-${viewerKey}`}
          source={{ uri: imageUri }}
          style={styles.mainImage}
          resizeMode="contain"
        />
      </TouchableWithoutFeedback>
    </ScrollView>
  );
}

export default function DemThepScreen() {
  const { colors } = useTheme();
  const mainScrollRef = useRef<ScrollView>(null);

  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentMode, setCurrentMode] = useState<number>(1);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);

  useEffect(() => {
    loadHistory();
    ensureDefaultSettings();
  }, []);

  const normalizeStoredConf = (value: string | null, fallback: string) => {
    if (!value || value.trim() === '') return fallback;

    const normalizedText = value.trim().replace(',', '.');
    const numberValue = Number(normalizedText);

    if (Number.isNaN(numberValue)) return fallback;
    if (numberValue > 1) return String(numberValue / 100);

    return normalizedText;
  };

  const ensureDefaultSettings = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
      const savedMinConf = await AsyncStorage.getItem(MIN_CONF_KEY);
      const savedAlertConf = await AsyncStorage.getItem(ALERT_CONF_KEY);

      const nextServerUrl = savedUrl && savedUrl.trim() !== '' ? savedUrl : DEFAULT_SERVER_URL;
      const nextMinConf = normalizeStoredConf(savedMinConf, DEFAULT_MIN_CONF);
      const nextAlertConf = normalizeStoredConf(savedAlertConf, DEFAULT_ALERT_CONF);

      await AsyncStorage.setItem(SERVER_URL_KEY, nextServerUrl);
      await AsyncStorage.setItem(MIN_CONF_KEY, nextMinConf);
      await AsyncStorage.setItem(ALERT_CONF_KEY, nextAlertConf);

      await AsyncStorage.removeItem('ACTIVE_SERVER');
      await AsyncStorage.removeItem('COLAB_URL');
      await AsyncStorage.removeItem('HF_URL');
      await AsyncStorage.removeItem('KAGGLE_URL');
    } catch (error) {
      console.log('Lỗi thiết lập mặc định:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('DEMTHEP_HISTORY');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (error) {
      console.log('Lỗi tải lịch sử:', error);
    }
  };

  const saveToHistory = async (original: string, processed: string | undefined, count: number) => {
    try {
      const newItem: HistoryItem = {
        id: `${Date.now()}-${Math.random()}`,
        originalImage: original,
        processedImage: processed,
        count,
        date: new Date().toISOString(),
      };

      const newHistory = [newItem, ...history];
      setHistory(newHistory);
      await AsyncStorage.setItem('DEMTHEP_HISTORY', JSON.stringify(newHistory));
    } catch (error) {
      console.log('Lỗi lưu lịch sử:', error);
    }
  };

  const clearHistory = async () => {
    const clearLogic = async () => {
      await AsyncStorage.removeItem('DEMTHEP_HISTORY');
      setHistory([]);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Anh hai có chắc muốn xóa hết lịch sử đếm không?')) clearLogic();
    } else {
      Alert.alert('Xóa lịch sử', 'Anh hai có chắc muốn xóa hết lịch sử đếm không?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa sạch', style: 'destructive', onPress: clearLogic },
      ]);
    }
  };

  const viewHistoryItem = (item: HistoryItem) => {
    setBatch([
      {
        id: item.id,
        originalImage: item.originalImage,
        processedImage: item.processedImage || null,
        count: item.count,
        resultImages: { v1: item.processedImage || null, v2: null, v3: null },
        status: 'success',
        processingTime: null,
      },
    ]);

    setActiveIndex(0);
    setCurrentMode(1);
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const resizeImage = async (uri: string) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.log('Lỗi resize ảnh:', error);
      return uri;
    }
  };

  const pickImage = async (useCamera: boolean) => {
    Alert.alert('Test', useCamera ? 'Đã bấm Chụp ảnh' : 'Đã bấm Chọn ảnh');

    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: !useCamera,
        selectionLimit: useCamera ? 1 : 10,
      };

      let result;

      if (useCamera) {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (result.canceled) return;

      if (!result.assets || result.assets.length === 0) {
        Alert.alert('Lỗi', 'Không lấy được ảnh. Anh hai thử lại nhé.');
        return;
      }

      const batchStartTime = Date.now();

      const initialBatch: BatchItem[] = await Promise.all(
        result.assets.map(async (asset, index) => {
          const resized = await resizeImage(asset.uri);

          return {
            id: `${Date.now()}-${index}-${Math.random()}`,
            originalImage: resized,
            processedImage: null,
            count: null,
            resultImages: { v1: null, v2: null, v3: null },
            status: 'loading',
            processingTime: null,
          };
        })
      );

      setBatch(initialBatch);
      setActiveIndex(0);
      setCurrentMode(1);
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });

      for (let i = 0; i < initialBatch.length; i++) {
        setActiveIndex(i);
        await processSingleImage(initialBatch[i].originalImage, i, isFiltering, batchStartTime);
      }
    } catch (error: any) {
      console.log('Lỗi chọn/chụp ảnh:', error);
      Alert.alert('Lỗi chọn/chụp ảnh', error?.message || 'Không thể mở camera hoặc thư viện ảnh.');
    }
  };

  const processSingleImage = async (
    uri: string,
    targetIndex: number,
    currentFilterMode: boolean,
    startTime?: number
  ) => {
    const processStartTime = startTime || Date.now();

    setBatch(prev => {
      const newBatch = [...prev];
      if (newBatch[targetIndex]) {
        newBatch[targetIndex].status = 'loading';
        newBatch[targetIndex].processingTime = null;
      }
      return newBatch;
    });

    try {
      let currentServerUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
      let minConf = await AsyncStorage.getItem(MIN_CONF_KEY);
      let alertConf = await AsyncStorage.getItem(ALERT_CONF_KEY);

      currentServerUrl = currentServerUrl && currentServerUrl.trim() !== '' ? currentServerUrl : DEFAULT_SERVER_URL;
      minConf = normalizeStoredConf(minConf, DEFAULT_MIN_CONF);
      alertConf = normalizeStoredConf(alertConf, DEFAULT_ALERT_CONF);

      await AsyncStorage.setItem(SERVER_URL_KEY, currentServerUrl);
      await AsyncStorage.setItem(MIN_CONF_KEY, minConf);
      await AsyncStorage.setItem(ALERT_CONF_KEY, alertConf);

      const formData = new FormData();

      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append('file', blob, 'image.jpg');
      } else {
        const filename = uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        // @ts-ignore
        formData.append('file', { uri, name: filename, type });
      }

      formData.append('min_conf', minConf);
      formData.append('alert_conf', alertConf);
      formData.append('is_filtering', currentFilterMode ? 'true' : 'false');

      const response = await fetch(currentServerUrl, {
        method: 'POST',
        body: formData,
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Máy chủ lỗi ${response.status}: ${responseText.slice(0, 120)}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Máy chủ không trả JSON. Có thể link rút gọn đang trả HTML hoặc redirect sai.');
      }

      if (data.error) throw new Error(String(data.error));

      if (data.count !== undefined) {
        const elapsedSeconds = Number(((Date.now() - processStartTime) / 1000).toFixed(1));
        const uri1 = data.image_v1 ? `data:image/jpeg;base64,${data.image_v1}` : null;
        const fallbackUri = uri1 || (data.image_base64 ? `data:image/jpeg;base64,${data.image_base64}` : null);

        setBatch(prev => {
          const newBatch = [...prev];
          if (newBatch[targetIndex]) {
            newBatch[targetIndex] = {
              ...newBatch[targetIndex],
              count: data.count,
              resultImages: {
                v1: uri1,
                v2: data.image_v2 ? `data:image/jpeg;base64,${data.image_v2}` : null,
                v3: data.image_v3 ? `data:image/jpeg;base64,${data.image_v3}` : null,
              },
              processedImage: fallbackUri,
              status: 'success',
              processingTime: elapsedSeconds,
            };
          }
          return newBatch;
        });

        if (fallbackUri && !currentFilterMode) saveToHistory(uri, fallbackUri, data.count);
      } else {
        throw new Error('Lỗi dữ liệu trả về!');
      }
    } catch (error: any) {
      const elapsedSeconds = Number(((Date.now() - processStartTime) / 1000).toFixed(1));
      console.log(error);

      setBatch(prev => {
        const newBatch = [...prev];
        if (newBatch[targetIndex]) {
          newBatch[targetIndex].status = 'error';
          newBatch[targetIndex].processingTime = elapsedSeconds;
        }
        return newBatch;
      });

      if (batch.length === 1 || targetIndex === activeIndex) {
        Alert.alert('Lỗi', error.message || 'Không thể kết nối máy chủ.');
      }
    }
  };

  const handleModeChange = (mode: number) => setCurrentMode(mode);

  const toggleFilter = () => {
    const newMode = !isFiltering;
    const filterStartTime = Date.now();
    setIsFiltering(newMode);

    if (batch.length > 0 && activeIndex >= 0) {
      processSingleImage(batch[activeIndex].originalImage, activeIndex, newMode, filterStartTime);
    }
  };

  const currentActiveItem = batch[activeIndex];

  const getDisplayImage = () => {
    if (!currentActiveItem) return null;
    if (currentMode === 1 && currentActiveItem.resultImages.v1) return currentActiveItem.resultImages.v1;
    if (currentMode === 2 && currentActiveItem.resultImages.v2) return currentActiveItem.resultImages.v2;
    if (currentMode === 3 && currentActiveItem.resultImages.v3) return currentActiveItem.resultImages.v3;
    return currentActiveItem.processedImage || currentActiveItem.originalImage;
  };

  const bgColors = [colors.bg, colors.bg] as [string, string, ...string[]];
  const displayUri = getDisplayImage();
  const isCurrentlyLoading = currentActiveItem?.status === 'loading';

  return (
    <LinearGradient colors={bgColors} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView ref={mainScrollRef} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerSide} />

            <View style={styles.headerCenter}>
              <View style={[styles.nameBadge, { backgroundColor: colors.iconBg, borderColor: colors.primary }]}>
                <Ionicons name="person-circle" size={16} color={colors.primary} />
                <Text
                  style={[styles.subtitle, { color: colors.primary, textShadowColor: colors.border }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  allowFontScaling={false}
                  adjustsFontSizeToFit={false}
                >
                  Nguyễn Thanh Dương - HPDQ01016
                </Text>
              </View>
            </View>

            <View style={styles.headerSide} />
          </View>

          <View style={[styles.imagePanel, { borderColor: colors.border, backgroundColor: colors.card }]}> 
            {isCurrentlyLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.text, marginTop: 10, textAlign: 'center' }}>Đang đếm thép...</Text>
              </View>
            ) : displayUri ? (
              <SteelImageViewer
                key={`${currentActiveItem?.id || 'empty'}-${currentMode}-${currentActiveItem?.status || 'idle'}`}
                imageUri={displayUri}
                resetTrigger={`${currentActiveItem?.id || 'empty'}-${currentMode}-${currentActiveItem?.status || 'idle'}`}
              />
            ) : (
              <View style={styles.placeholderBox}>
                <Ionicons name="image-outline" size={50} color={colors.subText} />
                <Text style={{ color: colors.subText, marginTop: 10, textAlign: 'center' }}>Chưa có ảnh nào được chọn</Text>
              </View>
            )}
          </View>

          {currentActiveItem?.status === 'success' && currentActiveItem?.count !== null && (
            <View style={styles.totalContainer}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalText, { color: colors.primary }]}> 
                  {isFiltering ? `ĐANG LỌC: ${currentActiveItem.count} LỖI` : `Tổng: ${currentActiveItem.count} cây`}
                </Text>
                {currentActiveItem.processingTime !== null && (
                  <Text style={[styles.processingTimeText, { color: colors.subText }]}> 
                    {currentActiveItem.processingTime} giây
                  </Text>
                )}
              </View>
            </View>
          )}

          {batch.length > 1 && (
            <View style={styles.thumbnailContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {batch.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setActiveIndex(idx)}
                    style={[
                      styles.thumbWrap,
                      { borderColor: activeIndex === idx ? colors.primary : 'transparent' },
                      item.status === 'error' && { borderColor: colors.error },
                    ]}
                  >
                    <Image source={{ uri: item.processedImage || item.originalImage }} style={styles.thumbImage} />
                    {item.status === 'loading' && (
                      <View style={styles.thumbOverlay}>
                        <ActivityIndicator size="small" color="white" />
                      </View>
                    )}
                    {item.status === 'success' && item.count !== null && (
                      <View style={[styles.thumbBadge, { backgroundColor: colors.primary }]}> 
                        <Text style={styles.thumbBadgeText}>{item.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.modeBtn, { backgroundColor: currentMode === 1 ? colors.primary : colors.card, borderColor: currentMode === 1 ? colors.primary : colors.border }]}
              onPress={() => handleModeChange(1)}
            >
              <Text style={[styles.modeText, { color: currentMode === 1 ? 'white' : colors.text }]}>Khung</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, { backgroundColor: currentMode === 2 ? colors.primary : colors.card, borderColor: currentMode === 2 ? colors.primary : colors.border }]}
              onPress={() => handleModeChange(2)}
            >
              <Text style={[styles.modeText, { color: currentMode === 2 ? 'white' : colors.text }]}>K+Số</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, { backgroundColor: currentMode === 3 ? colors.primary : colors.card, borderColor: currentMode === 3 ? colors.primary : colors.border }]}
              onPress={() => handleModeChange(3)}
            >
              <Text style={[styles.modeText, { color: currentMode === 3 ? 'white' : colors.text }]}>Số</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, { backgroundColor: isFiltering ? '#EAB308' : colors.card, borderColor: isFiltering ? '#EAB308' : colors.border }]}
              onPress={toggleFilter}
            >
              <Text style={[styles.modeText, { color: isFiltering ? 'white' : colors.text }]}> 
                {isFiltering ? 'Tắt Lọc' : 'Bật Lọc'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => pickImage(true)}>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.btnText}>Chụp Ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.iconBg, borderWidth: 1, borderColor: colors.border }]} onPress={() => pickImage(false)}>
              <Ionicons name="images" size={24} color={colors.text} />
              <Text style={[styles.btnText, { color: colors.text }]}>Chọn Ảnh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Lịch Sử Đếm Gần Đây</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Ionicons name="trash-bin-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          {history.length === 0 ? (
            <Text style={{ color: colors.subText, fontStyle: 'italic', textAlign: 'center' }}>Chưa có lịch sử.</Text>
          ) : (
            history.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => viewHistoryItem(item)}
              >
                <Image source={{ uri: item.processedImage || item.originalImage }} style={styles.historyThumb} />
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyCount, { color: colors.primary }]}> 
                    {item.count} cây
                  </Text>
                  <Text style={{ color: colors.subText, fontSize: 10 }}>
                    {format(new Date(item.date), 'HH:mm dd/MM/')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.subText} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 12, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  headerSide: { width: 34 },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  nameBadge: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  subtitle: {
    flexShrink: 1,
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  imagePanel: {
    width: '100%',
    height: WORKSPACE_HEIGHT,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderBox: { alignItems: 'center', justifyContent: 'center' },
  loadingBox: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  viewerScroll: { width: '100%', height: '100%' },
  viewerContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  mainImage: { width: '100%', height: '100%' },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  totalText: { fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
  processingTimeText: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 3,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  modeText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 15 },
  thumbnailContainer: { marginBottom: 10, height: 60 },
  thumbWrap: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  thumbBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 3, paddingVertical: 1, borderBottomLeftRadius: 5 },
  thumbBadgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  separator: { height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginVertical: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyTitle: { fontSize: 16, fontWeight: 'bold' },
  historyCard: { flexDirection: 'row', padding: 8, borderRadius: 10, borderWidth: 1, marginBottom: 8, alignItems: 'center' },
  historyThumb: { width: 45, height: 45, borderRadius: 6, marginRight: 10 },
  historyInfo: { flex: 1 },
  historyCount: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
});
