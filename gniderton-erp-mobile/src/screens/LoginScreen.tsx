import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function LoginScreen({ navigation }: any) {
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAppStore(state => state.setUser);

  const handleLogin = async () => {
    if (!code.trim()) { Alert.alert('Error', 'Enter employee code'); return; }
    setLoading(true);
    
    try {
      const response = await axios.get(`${API_URL}/employees`);
      const employees = response.data?.data || response.data;
      
      const user = employees.find((e: any) => 
        String(e.employee_code || '').toLowerCase() === code.trim().toLowerCase() &&
        String(e.login_pin || '') === pin.trim()
      );

      if (user) {
        let deviceId = '';
        if (Platform.OS === 'android') {
          deviceId = Application.getAndroidId() || 'unknown-android';
        } else {
          deviceId = await Application.getIosIdForVendorAsync() || 'unknown-ios';
        }

        if (!user.device_id) {
          try {
            await axios.post(`${API_URL}/employees/${user.id}/register-device`, { device_id: deviceId });
            user.device_id = deviceId;
            setUser(user);
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to register this device.');
          }
        } else if (user.device_id !== deviceId) {
          Alert.alert('Access Denied', 'This account is bound to another device. Please contact your administrator.');
        } else {
          setUser(user);
        }
      } else {
        Alert.alert('Error', 'Invalid code or PIN');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection error. Check your network or API URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>D</Text>
          </View>
          <Text style={styles.title}>DSE Portal</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Employee Code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="e.g. DSE001"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="Enter PIN"
            secureTextEntry
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, maxWidth: 400, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: -8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, height: 48, fontSize: 16 },
  button: { backgroundColor: '#2f7f74', height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
