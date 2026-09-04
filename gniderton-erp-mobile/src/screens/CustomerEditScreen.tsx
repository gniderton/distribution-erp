import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, MapPin, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useAppStore } from '../store';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import * as Location from 'expo-location';
import { API_URL } from '../api/config';
import { calculateDistance } from '../utils/geo';

export default function CustomerEditScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { currentUser, selectedCustomer } = useAppStore();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState(selectedCustomer?.customer_name || '');
  const [phone, setPhone] = useState(selectedCustomer?.customer_phone || selectedCustomer?.contact_primary || '');
  const [gstin, setGstin] = useState(selectedCustomer?.gstin || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkProximity = async () => {
      if (!selectedCustomer) return;
      const cLat = selectedCustomer.latitude || selectedCustomer.location_lat;
      const cLng = selectedCustomer.longitude || selectedCustomer.location_lng;
      if (!cLat || !cLng) {
        setCheckingAccess(false);
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            Number(cLat),
            Number(cLng)
          );
          if (distance > 200) {
            setAccessDenied(true);
          }
        }
      } catch (err) {
        console.log('Proximity check failed', err);
      } finally {
        setCheckingAccess(false);
      }
    };
    checkProximity();
  }, [selectedCustomer]);

  if (!selectedCustomer) {
    setTimeout(() => navigation.goBack(), 0);
    return null;
  }

  if (checkingAccess) {
    return (
      <View style={styles.successContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 16, color: theme.textSecondary }}>Verifying location access...</Text>
      </View>
    );
  }

  if (accessDenied) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
        </View>
        <View style={styles.successContainer}>
          <View style={[styles.successIconBox, { backgroundColor: '#fef2f2' }]}>
            <ShieldAlert size={32} color="#ef4444" />
          </View>
          <Text style={styles.successTitle}>Restricted Access</Text>
          <Text style={styles.successSub}>You can only request profile edits when you are physically near the verified shop location (&gt;200m away).</Text>
          <TouchableOpacity style={[styles.submitBtn, { width: 200 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.submitBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const phoneValid = /^[6-9]\d{9}$/.test(phone.trim());
  const gstValid = gstin === '' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
  
  // Only allow submit if fields actually changed and are valid
  const hasChanges = name !== selectedCustomer.customer_name || 
                     phone !== (selectedCustomer.customer_phone || selectedCustomer.contact_primary || '') || 
                     gstin !== (selectedCustomer.gstin || '');

  const canSubmit = name.trim().length > 0 && phoneValid && gstValid && hasChanges && !loading;


  const handleSubmit = async () => {
    if (!canSubmit || !currentUser || loading) return;
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
        customer_id: selectedCustomer.id,
        dse_id: currentUser.id,
        name: name.trim(),
        phone: phone.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        latitude: lat,
        longitude: lng,
      });
      
      setName('');
      setPhone('');
      setGstin('');
      
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      useAppStore.getState().markCustomerSessionVerified(selectedCustomer.id);
      
      setSuccess(true);
      setTimeout(() => navigation.navigate('CustomerHub'), 2000);
    } catch {
      Alert.alert('Error', 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconBox}>
          <Send size={32} color={theme.success} />
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
          <ChevronLeft size={24} color={theme.text} />
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
            placeholderTextColor={theme.textMuted}
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
            placeholderTextColor={theme.textMuted}
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
            placeholderTextColor={theme.textMuted}
          />
          {!!gstin && !gstValid && <Text style={styles.errorText}>Invalid GSTIN format</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? <ActivityIndicator color={theme.card} /> : (
            <>
              <Send size={20} color={theme.card} style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit Changes</Text>
            </>
          )}
        </TouchableOpacity>

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
  successIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.isDark ? '#14532d' : '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
  successSub: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
  infoBox: { backgroundColor: theme.isDark ? '#1e293b' : '#eff6ff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.isDark ? '#334155' : '#bfdbfe', marginBottom: 16 },
  infoTitle: { fontSize: 13, fontWeight: '600', color: theme.isDark ? '#60a5fa' : '#1d4ed8', marginBottom: 2 },
  infoSub: { fontSize: 12, color: theme.primary },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: theme.textSecondary, marginBottom: 6 },
  asterisk: { color: theme.error },
  input: { backgroundColor: theme.input, borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, color: theme.text },
  inputError: { borderWidth: 1, borderColor: theme.error },
  errorText: { color: theme.error, fontSize: 12, marginTop: 4 },
  submitBtn: { flexDirection: 'row', backgroundColor: theme.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: theme.card, fontSize: 16, fontWeight: 'bold' },
});
