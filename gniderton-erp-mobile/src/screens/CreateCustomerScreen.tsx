import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, UserPlus, MapPin } from 'lucide-react-native';
import { useAppStore } from '../store';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function CreateCustomerScreen({ navigation }: any) {
  const { currentUser } = useAppStore();
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
      await axios.post(`${API_URL}/verify-requests`, {
        customer_id: null,
        dse_id: currentUser.id,
        name: name.trim(),
        phone: phone.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        latitude: 0,
        longitude: 0,
      });
      
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
          <UserPlus size={32} color="#16a34a" />
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
          <ChevronLeft size={24} color="#111827" />
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
            placeholderTextColor="#9ca3af"
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
            placeholderTextColor="#9ca3af"
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
            placeholderTextColor="#9ca3af"
          />
          {!!gstin && !gstValid && <Text style={styles.errorText}>Invalid GSTIN format</Text>}
        </View>

        <View style={styles.gpsBox}>
          <View style={styles.gpsIconBox}>
            <MapPin size={16} color="#6b7280" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827' },
  content: { padding: 16 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 32 },
  successIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  infoBox: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 16 },
  infoTitle: { fontSize: 13, fontWeight: '600', color: '#1d4ed8', marginBottom: 2 },
  infoSub: { fontSize: 12, color: '#2563eb' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginBottom: 6 },
  asterisk: { color: '#ef4444' },
  input: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, color: '#111827' },
  inputError: { borderWidth: 1, borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  gpsBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 24 },
  gpsIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  gpsText: { fontSize: 13, color: '#6b7280' },
  submitBtn: { flexDirection: 'row', backgroundColor: '#2563eb', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#6b7280' }
});
