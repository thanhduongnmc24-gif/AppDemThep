import React, { useEffect, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Animated, Easing } from 'react-native'; 
import { useTheme } from '../context/ThemeContext';
// Nếu anh hai vẫn giữ logic đồng bộ Supabase trong file này thì mở comment dòng dưới ra nhé
// import { supabase } from '../supabaseConfig'; 

export default function TabLayout() {
  const { colors } = useTheme();
  
  // --- STATE SYNC (GIỮ NGUYÊN CODE CŨ CỦA ANH HAI) ---
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'downloading'>('idle');
  const spinValue = useRef(new Animated.Value(0)).current;

  // Hiệu ứng xoay
  useEffect(() => {
    if (syncStatus === 'syncing' || syncStatus === 'downloading') {
      Animated.loop(Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })).start();
    } else {
      spinValue.setValue(0);
    }
  }, [syncStatus]);
  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // (Anh hai dán lại phần logic xử lý đồng bộ thực tế vào khu vực này nếu có nhé)
  // ... 

  return (
    <View style={{flex: 1, backgroundColor: colors.bg}}>
      <Tabs screenOptions={{ 
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.subText,
        }}>
        
        {/* TAB 1: ĐẾM THÉP */}
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Đếm thép', 
            tabBarIcon: ({ color }) => <Ionicons name="scan-circle" size={24} color={color} /> 
          }} 
        />

        {/* TAB 2: CÀI ĐẶT */}
        <Tabs.Screen 
          name="settings" 
          options={{ 
            title: 'Cài đặt', 
            tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} /> 
          }} 
        />
      </Tabs>

      {/* SYNC INDICATOR (GIỮ NGUYÊN CHỈ BÁO ĐỒNG BỘ) */}
      {syncStatus !== 'idle' && (
        <View style={{
            position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, right: 15, flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.card, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
            shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3.84, elevation: 5, zIndex: 10000 
        }}>
           {(syncStatus === 'syncing' || syncStatus === 'downloading') && (
             <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name={syncStatus === 'downloading' ? "cloud-download" : "sync"} size={16} color={colors.primary} />
             </Animated.View>
           )}
           {syncStatus === 'success' && <Ionicons name="cloud-done" size={18} color="#22C55E" />}
           {syncStatus === 'error' && <Ionicons name="cloud-offline" size={18} color="#EF4444" />}
        </View>
      )}
    </View>
  );
}