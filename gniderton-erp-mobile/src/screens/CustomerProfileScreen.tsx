import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, MapPin, FileText, Pencil } from 'lucide-react-native';
import { useAppStore } from '../store';

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function CustomerProfileScreen({ navigation }: any) {
  const { selectedCustomer } = useAppStore();

  if (!selectedCustomer) {
    setTimeout(() => navigation.goBack(), 0);
    return null;
  }

  const c = selectedCustomer;
  const phoneNum = c.whatsapp_number ?? c.contact_primary;
  const hasPhone = !!phoneNum;
  
  const mapsUrl = c.latitude && c.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{c.customer_name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {hasPhone && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]} 
              onPress={() => Linking.openURL(`tel:${phoneNum}`)}
            >
              <Phone size={16} color="#15803d" />
              <Text style={[styles.actionBtnText, { color: '#15803d' }]}>Call</Text>
            </TouchableOpacity>
          )}
          {mapsUrl && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]} 
              onPress={() => Linking.openURL(mapsUrl)}
            >
              <MapPin size={16} color="#1d4ed8" />
              <Text style={[styles.actionBtnText, { color: '#1d4ed8' }]}>Directions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Row label="Customer Code" value={c.customer_code} />
          <Row label="Phone" value={phoneNum} />
          <Row label="GSTIN" value={c.gstin} />
          <Row label="Address" value={[c.address_line1, c.city].filter(Boolean).join(', ')} />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.mainBtn} 
          onPress={() => navigation.navigate('PaymentList')}
        >
          <FileText size={20} color="#6b7280" />
          <View style={styles.mainBtnTextContainer}>
            <Text style={styles.mainBtnTitle}>View Pending Bills</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.mainBtn} 
          onPress={() => navigation.navigate('CustomerEdit')}
        >
          <Pencil size={20} color="#6b7280" />
          <View style={styles.mainBtnTextContainer}>
            <Text style={styles.mainBtnTitle}>Request Edit / Update</Text>
            <Text style={styles.mainBtnSub}>Pending admin approval</Text>
          </View>
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
  
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '500', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  
  mainBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, gap: 12 },
  mainBtnTextContainer: { flex: 1 },
  mainBtnTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  mainBtnSub: { fontSize: 12, color: '#6b7280', marginTop: 2 }
});
