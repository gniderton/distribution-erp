import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, MapPin, FileText, Pencil } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useAppStore } from '../store';

function Row({ label, value, styles }: { label: string; value?: string | number | null; styles: any }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function CustomerProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { selectedCustomer } = useAppStore();

  if (!selectedCustomer) {
    setTimeout(() => navigation.goBack(), 0);
    return null;
  }

  const c = selectedCustomer;
  const phoneNum = c.customer_phone || c.contact_primary || c.whatsapp_number;
  const hasPhone = !!phoneNum;
  
  const cLat = c.latitude || c.location_lat;
  const cLng = c.longitude || c.location_lng;
  const mapsUrl = cLat && cLng
    ? `https://www.google.com/maps/search/?api=1&query=${cLat},${cLng}`
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{c.customer_name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Status Badge */}
        <View style={styles.badgeContainer}>
          {c.is_verified || c.verification_status === 'Verified' ? (
            <View style={[styles.badge, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
              <Text style={[styles.badgeText, { color: '#166534' }]}>🟢 Verified</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
              <Text style={[styles.badgeText, { color: '#92400e' }]}>🟡 {c.verification_status || 'Pending Verification'}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {hasPhone && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: theme.isDark ? '#14532d' : '#f0fdf4', borderColor: theme.isDark ? '#166534' : '#bbf7d0' }]} 
              onPress={() => Linking.openURL(`tel:${phoneNum}`)}
            >
              <Phone size={16} color={theme.isDark ? '#4ade80' : '#15803d'} />
              <Text style={[styles.actionBtnText, { color: theme.isDark ? '#4ade80' : '#15803d' }]}>Call</Text>
            </TouchableOpacity>
          )}
          {mapsUrl && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: theme.isDark ? '#1e293b' : '#eff6ff', borderColor: theme.isDark ? '#334155' : '#bfdbfe' }]} 
              onPress={() => Linking.openURL(mapsUrl)}
            >
              <MapPin size={16} color={theme.isDark ? '#60a5fa' : '#1d4ed8'} />
              <Text style={[styles.actionBtnText, { color: theme.isDark ? '#60a5fa' : '#1d4ed8' }]}>Directions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Row label="Customer Code" value={c.customer_code} styles={styles} />
          <Row label="Phone" value={phoneNum} styles={styles} />
          <Row label="GSTIN" value={c.gstin} styles={styles} />
          <Row label="Address" value={[c.address_line1, c.city].filter(Boolean).join(', ')} styles={styles} />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.mainBtn} 
          onPress={() => navigation.navigate('PaymentList')}
        >
          <FileText size={20} color={theme.textSecondary} />
          <View style={styles.mainBtnTextContainer}>
            <Text style={styles.mainBtnTitle}>View Pending Bills</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.mainBtn} 
          onPress={() => navigation.navigate('CustomerEdit')}
        >
          <Pencil size={20} color={theme.textSecondary} />
          <View style={styles.mainBtnTextContainer}>
            <Text style={styles.mainBtnTitle}>Request Edit / Update</Text>
            <Text style={styles.mainBtnSub}>Requires admin approval</Text>
          </View>
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
  
  badgeContainer: { marginBottom: 16 },
  badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 13, fontWeight: 'bold' },

  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  
  card: { backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  rowLabel: { fontSize: 14, color: theme.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '500', color: theme.text, maxWidth: '60%', textAlign: 'right' },
  
  mainBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 12, gap: 12 },
  mainBtnTextContainer: { flex: 1 },
  mainBtnTitle: { fontSize: 14, fontWeight: '500', color: theme.text },
  mainBtnSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 }
});
