import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Edit2 } from 'lucide-react-native';
import { useAppStore } from '../store';

export default function CustomerProfileScreen({ navigation }: any) {
  const { selectedCustomer } = useAppStore();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CustomerEdit')} style={styles.iconBtn}>
          <Edit2 size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{selectedCustomer?.customer_name}</Text>
          
          <Text style={[styles.label, { marginTop: 16 }]}>Code</Text>
          <Text style={styles.value}>{selectedCustomer?.customer_code || 'N/A'}</Text>
          
          <Text style={[styles.label, { marginTop: 16 }]}>Phone</Text>
          <Text style={styles.value}>{selectedCustomer?.customer_phone || selectedCustomer?.contact_primary || 'N/A'}</Text>
          
          <Text style={[styles.label, { marginTop: 16 }]}>Address</Text>
          <Text style={styles.value}>{selectedCustomer?.billing_address || 'N/A'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '500', color: '#111827' }
});
