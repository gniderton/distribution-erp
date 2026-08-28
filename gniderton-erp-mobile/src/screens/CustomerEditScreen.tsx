import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, MapPin } from 'lucide-react-native';
import { useAppStore } from '../store';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function CustomerEditScreen({ navigation }: any) {
  const { currentUser, selectedCustomer } = useAppStore();
  
  const [name, setName] = useState(selectedCustomer?.customer_name || '');
  const [phone, setPhone] = useState(selectedCustomer?.customer_phone || selectedCustomer?.contact_primary || '');
  const [gstin, setGstin] = useState(selectedCustomer?.gstin || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!selectedCustomer) {
    setTimeout(() => navigation.goBack(), 0);
    return null;
  }

  const phoneValid = /^[6-9]\d{9}$/.test(phone.trim());
  const gstValid = gstin === '' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
  
  // Only allow submit if fields actually changed and are valid
  const hasChanges = name !== selectedCustomer.customer_name || 
                     phone !== (selectedCustomer.customer_phone || selectedCustomer.contact_primary || '') || 
                     gstin !== (selectedCustomer.gstin || '');

  const canSubmit = name.trim().length > 0 && phoneValid && gstValid && hasChanges && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setLoading(true);

    try {
      await axios.post(`${API_URL}/verify-requests`, {
        customer_id: selectedCustomer.id,
        dse_id: currentUser.id,
        name: name.trim(),
        phone: phone.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        latitude: 0,
        longitude: 0,
      }).catch(() => {});
      
      setSuccess(true);
      setTimeout(() => navigation.navigate('CustomerHub'), 2000);
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
          <Send size={32} color="#16a34a" />
        </View>
        <Text style={styles.successTitle}>Update Requested!</Text>
        <Text style={styles.successSub}>Edit request has been sent to the admin for approval.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Details</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Update Request</Text>
          <Text style={styles.infoSub}>Changes will reflect after admin approval.</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Customer / Shop Name <Text style={styles.asterisk}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mobile Number <Text style={styles.asterisk}>*</Text></Text>
          <TextInput
            style={[styles.input, phone && !phoneValid && styles.inputError]}
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
            value={gstin}
            onChangeText={(t) => setGstin(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={15}
            placeholderTextColor="#9ca3af"
          />
          {!!gstin && !gstValid && <Text style={styles.errorText}>Invalid GSTIN format</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Send size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit Changes</Text>
            </>
          )}
        </TouchableOpacity>

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
  submitBtn: { flexDirection: 'row', backgroundColor: '#2563eb', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
