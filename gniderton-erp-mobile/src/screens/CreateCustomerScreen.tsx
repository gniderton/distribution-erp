import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, UserPlus, MapPin } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useTheme } from '../theme';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import * as Location from 'expo-location';
import { API_URL } from '../api/config';

export default function CreateCustomerScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { currentUser } = useAppStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const phoneValid = /^[6-9]\d{9}$/.test(phone.trim());
  const gstValid = gstin === '' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
  const canSubmit = name.trim().length > 0 && phoneValid && gstValid && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setLoading(true);

    try {
      let lat = 0;
      let lng = 0;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        }
      } catch (err) {
        console.log('Location fetch failed:', err);
      }

      await axios.post(`${API_URL}/verify-requests`, {
        customer_id: null,
        dse_id: currentUser.id,
        name: name.trim(),
        phone: phone.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        latitude: lat,
        longitude: lng,
      });
      
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSuccess(true);
      setTimeout(() => navigation.navigate('Home'), 2000);
    } catch {
      Alert.alert('Error', 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconBox}>
          <UserPlus size={32} color={theme.success} />
        </View>
        <Text style={styles.successTitle}>Request Sent!</Text>
        <Text style={styles.successSub}>New customer request has been sent to the admin for approval.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Customer</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>New customer request</Text>
          <Text style={styles.infoSub}>The customer will be created after admin approval.</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Customer / Shop Name <Text style={styles.asterisk}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sri Ram Traders"
            value={name}
            onChangeText={setName}
            placeholderTextColor={theme.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mobile Number <Text style={styles.asterisk}>*</Text></Text>
          <TextInput
            style={[styles.input, phone && !phoneValid && styles.inputError]}
            placeholder="10-digit mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor={theme.textMuted}
          />
          {!!phone && !phoneValid && <Text style={styles.errorText}>Enter a valid 10-digit mobile number</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>GSTIN (optional)</Text>
          <TextInput
            style={[styles.input, gstin && !gstValid && styles.inputError]}
            placeholder="e.g. 29ABCDE1234F1Z5"
            value={gstin}
            onChangeText={(t) => setGstin(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={15}
            placeholderTextColor={theme.textMuted}
          />
          {!!gstin && !gstValid && <Text style={styles.errorText}>Invalid GSTIN format</Text>}
        </View>

        <View style={styles.gpsBox}>
          <View style={styles.gpsIconBox}>
            <MapPin size={16} color={theme.textSecondary} />
          </View>
          <Text style={styles.gpsText}>GPS auto-captured on submit</Text>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <UserPlus size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit Request</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>Customer activated after admin approval</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: theme.text },
  content: { padding: 16 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, padding: 32 },
  successIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.input, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
  successSub: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
  infoBox: { backgroundColor: theme.input, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  infoTitle: { fontSize: 13, fontWeight: '600', color: theme.primary, marginBottom: 2 },
  infoSub: { fontSize: 12, color: theme.textSecondary },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: theme.textSecondary, marginBottom: 6 },
  asterisk: { color: theme.error },
  input: { backgroundColor: theme.input, borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, color: theme.text },
  inputError: { borderWidth: 1, borderColor: theme.error },
  errorText: { color: theme.error, fontSize: 12, marginTop: 4 },
  gpsBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 24 },
  gpsIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.input, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  gpsText: { fontSize: 13, color: theme.textSecondary },
  submitBtn: { flexDirection: 'row', backgroundColor: theme.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', fontSize: 12, color: theme.textSecondary }
});
