import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, UserPlus, Phone, MapPin } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function AdHocCustomersScreen({ navigation }: any) {
  const { currentUser, setSelectedCustomer } = useAppStore();
  const [search, setSearch] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', currentUser?.id, 'all'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/customers`, { params: { dse_id: currentUser?.id } });
      return res.data;
    },
    enabled: !!currentUser?.id
  });

  const filtered = (customers || []).filter((c: any) => 
    (c.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_code || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (customer: any) => {
    setSelectedCustomer(customer);
    navigation.navigate('CustomerHub');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Customers</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateCustomer')} style={styles.newBtn}>
          <UserPlus size={16} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Search size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search all customers..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.customerCard} onPress={() => handleSelect(item)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.customer_name || 'C').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
                <Text style={styles.customerCode}>{item.customer_code}</Text>
              </View>
              <View style={styles.actions}>
                {(item.customer_phone || item.contact_primary) && (
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => Linking.openURL(`tel:${item.customer_phone || item.contact_primary}`)}
                  >
                    <Phone size={18} color="#2563eb" />
                  </TouchableOpacity>
                )}
                {item.latitude && item.longitude && (
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`)}
                  >
                    <MapPin size={18} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No customers found</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827' },
  newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  newBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 24 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#2563eb', fontWeight: 'bold', fontSize: 16 },
  customerInfo: { flex: 1, marginRight: 8 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  customerCode: { fontSize: 13, color: '#6b7280' },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8, borderRadius: 20, backgroundColor: '#f3f4f6' }
});
