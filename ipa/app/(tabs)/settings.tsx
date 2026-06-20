import React, { useState, useEffect } from 'react';
import {
  Text, View, ScrollView, TextInput, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const SERVER_URL_KEY = 'SERVER_URL';
const MIN_CONF_KEY = 'MIN_CONF';
const ALERT_CONF_KEY = 'ALERT_CONF';

const DEFAULT_SERVER_URL = 'https://byvn.net/demthep';
const DEFAULT_MIN_CONF = '0.6';
const DEFAULT_ALERT_CONF = '0.7';

export default function SettingsScreen() {
  const { theme, toggleTheme, colors } = useTheme();

  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [minConf, setMinConf] = useState(DEFAULT_MIN_CONF);
  const [alertConf, setAlertConf] = useState(DEFAULT_ALERT_CONF);

  useEffect(() => {
    loadSettings();
  }, []);

  const normalizeStoredConf = (value: string | null, fallback: string) => {
    if (!value || value.trim() === '') return fallback;

    const normalizedText = value.trim().replace(',', '.');
    const numberValue = Number(normalizedText);

    if (Number.isNaN(numberValue)) return fallback;

    // Dọn dữ liệu cũ nếu trước đây đã lưu dạng 60 / 70.
    if (numberValue > 1) {
      return String(numberValue / 100);
    }

    return normalizedText;
  };

  const loadSettings = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
      const savedMinConf = await AsyncStorage.getItem(MIN_CONF_KEY);
      const savedAlertConf = await AsyncStorage.getItem(ALERT_CONF_KEY);

      const nextServerUrl = savedUrl && savedUrl.trim() !== '' ? savedUrl : DEFAULT_SERVER_URL;
      const nextMinConf = normalizeStoredConf(savedMinConf, DEFAULT_MIN_CONF);
      const nextAlertConf = normalizeStoredConf(savedAlertConf, DEFAULT_ALERT_CONF);

      setServerUrl(nextServerUrl);
      setMinConf(nextMinConf);
      setAlertConf(nextAlertConf);

      await AsyncStorage.setItem(SERVER_URL_KEY, nextServerUrl);
      await AsyncStorage.setItem(MIN_CONF_KEY, nextMinConf);
      await AsyncStorage.setItem(ALERT_CONF_KEY, nextAlertConf);

      // Dọn dữ liệu cũ để app không còn lựa chọn Colab / HF / Kaggle nữa.
      await AsyncStorage.removeItem('ACTIVE_SERVER');
      await AsyncStorage.removeItem('COLAB_URL');
      await AsyncStorage.removeItem('HF_URL');
      await AsyncStorage.removeItem('KAGGLE_URL');
    } catch (e) {
      console.error('Lỗi load settings:', e);
    }
  };

  const handleSaveServerUrl = async (text: string) => {
    setServerUrl(text);
    await AsyncStorage.setItem(SERVER_URL_KEY, text);
  };

  const handleSaveMinConf = async (text: string) => {
    setMinConf(text);
    await AsyncStorage.setItem(MIN_CONF_KEY, text);
  };

  const handleSaveAlertConf = async (text: string) => {
    setAlertConf(text);
    await AsyncStorage.setItem(ALERT_CONF_KEY, text);
  };

  const dynamicStyles = {
    container: { flex: 1, backgroundColor: colors.bg },
    headerTitle: { fontSize: 24, fontWeight: 'bold' as const, color: colors.text },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 'bold' as const,
      color: colors.subText,
      marginBottom: 8,
      marginTop: 15,
      textTransform: 'uppercase' as const
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 2,
      borderWidth: 1,
      borderColor: colors.border
    },
    text: { color: colors.text },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.iconBg,
      justifyContent: 'center' as const,
      alignItems: 'center' as const
    },
    authInput: {
      backgroundColor: colors.iconBg,
      color: colors.text,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 5
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: 10
    },
    settingRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    numberInput: {
      backgroundColor: colors.iconBg,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      width: 90,
      textAlign: 'center' as const,
      fontWeight: 'bold' as const
    }
  };

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ padding: 15, alignItems: 'center' }}>
          <Text style={dynamicStyles.headerTitle}>Cài Đặt</Text>
        </View>

        <View style={{ paddingHorizontal: 15 }}>
          {/* LINK MÁY CHỦ DUY NHẤT */}
          <Text style={dynamicStyles.sectionTitle}>🌐 LINK MÁY CHỦ ĐẾM THÉP</Text>

          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.row}>
              <View style={{ paddingRight: 15 }}>
                <Ionicons name="link" size={28} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                  Link máy chủ
                </Text>

                <TextInput
                  style={dynamicStyles.authInput}
                  placeholder="https://.../predict"
                  placeholderTextColor={colors.subText}
                  value={serverUrl}
                  onChangeText={handleSaveServerUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          </View>

          {/* THÔNG SỐ ĐẾM THÉP */}
          <Text style={dynamicStyles.sectionTitle}>⚙️ THÔNG SỐ ĐẾM THÉP</Text>

          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.row}>
              <View style={{ paddingRight: 15 }}>
                <Ionicons name="options" size={28} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                  Ngưỡng đếm thép (Min)
                </Text>
                <Text style={{ color: colors.subText, fontSize: 12, marginTop: 2 }}>
                  Mặc định: 0.6
                </Text>
              </View>

              <TextInput
                style={dynamicStyles.numberInput}
                value={minConf}
                onChangeText={handleSaveMinConf}
                keyboardType="numeric"
                placeholder="0.6"
                placeholderTextColor={colors.subText}
              />
            </View>

            <View style={dynamicStyles.settingRow}>
              <View style={{ paddingRight: 15 }}>
                <Ionicons name="warning" size={28} color="#EAB308" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                  Ngưỡng báo lỗi
                </Text>
                <Text style={{ color: colors.subText, fontSize: 12, marginTop: 2 }}>
                  Mặc định: 0.7
                </Text>
              </View>

              <TextInput
                style={dynamicStyles.numberInput}
                value={alertConf}
                onChangeText={handleSaveAlertConf}
                keyboardType="numeric"
                placeholder="0.7"
                placeholderTextColor={colors.subText}
              />
            </View>
          </View>

          {/* GIAO DIỆN */}
          <Text style={dynamicStyles.sectionTitle}>🎨 GIAO DIỆN</Text>

          <View style={dynamicStyles.card}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 10
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={dynamicStyles.iconBox}>
                  <Ionicons
                    name={theme === 'dark' ? 'moon' : 'sunny'}
                    size={18}
                    color={theme === 'dark' ? '#FDB813' : '#F59E0B'}
                  />
                </View>

                <Text style={[
                  dynamicStyles.text,
                  { marginLeft: 12, fontSize: 15, fontWeight: '500' }
                ]}>
                  {theme === 'dark' ? 'Chế độ Tối' : 'Chế độ Sáng'}
                </Text>
              </View>

              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
