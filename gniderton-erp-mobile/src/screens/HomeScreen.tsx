import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, User, TrendingUp, RefreshCw, LogOut, Plus, Bell, Trash2, Phone, MapPin } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';

type Tab = 'customers' | 'orders' | 'payments';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'customers', label: 'Customers' },
  { id: 'orders', label: 'Orders' },
  { id: 'payments', label: 'Payments' },
];

export default function HomeScreen({ navigation }: any) {
  const { currentUser, setSelectedCustomer, pendingOrders, pendingPayments, removePayment, setUser } = useAppStore();
  const [tab, setTab] = useState<Tab>('customers');
  const [search, setSearch] = useState('');

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['customers', currentUser?.id],
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

  const handleLogout = () => {
    setUser(null);
    navigation.replace('Login');
  };

  const orderTotal = pendingOrders.reduce((acc, o) => acc + (o.items || []).reduce((sum, i) => sum + (i.amount || 0), 0), 0);
  const paymentTotal = pendingPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>{currentUser?.full_name ?? currentUser?.employee_name ?? 'Home'}</Text>
            <Text style={styles.title}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('PriceAlerts')} style={styles.iconBtn}>
              <Bell size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('DseDashboard')} style={styles.iconBtn}>
              <TrendingUp size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => refetch()} style={styles.iconBtn}>
              <RefreshCw size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
              <LogOut size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, tab === t.id && styles.activeTab]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
              {t.id === 'orders' && pendingOrders.length > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{pendingOrders.length}</Text></View>
              )}
              {t.id === 'payments' && pendingPayments.length > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{pendingPayments.length}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {tab === 'customers' && (
          <>
            <View style={styles.searchBox}>
              <Search size={18} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search customers..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {isLoading • (
              <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
            ) : filtered.length === 0 • (
              <View style={styles.center}>
                <Text style={styles.emptyText}>{search • 'No customers match your search' : 'No customers for today'}</Text>
              </View>
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
                      <Text style={styles.customerName}>{item.customer_name}</Text>
                      <Text style={styles.customerCode}>{item.customer_code}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {item.customer_phone ? (
                        <TouchableOpacity 
                          style={styles.actionCircle}
                          onPress={() => Linking.openURL(`tel:${item.customer_phone}`)}
                        >
                          <Phone size={16} color="#2f7f74" />
                        </TouchableOpacity>
                      ) : null}
                      {item.latitude && item.longitude ? (
                        <TouchableOpacity 
                          style={styles.actionCircle}
                          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`)}
                        >
                          <MapPin size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}

        {tab === 'orders' && (
          <FlatList
            data={pendingOrders}
            keyExtractor={item => String(item.tempId)}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={[styles.summaryCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                <View>
                  <Text style={styles.summaryLabel}>Orders</Text>
                  <Text style={styles.summaryValue}>{pendingOrders.length}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.summaryLabel}>Total Value</Text>
                  <Text style={styles.summaryValue}>₹{orderTotal.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>{item.customer_name}</Text>
                </View>
                <View style={styles.itemCardFooter}>
                  <Text style={styles.itemCardSub}>{item.items?.length || 0} items</Text>
                  <Text style={styles.itemCardVal}>₹{(item.items || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}><Text style={styles.emptyText}>No orders saved yet</Text></View>
            }
            ListFooterComponent={
              <TouchableOpacity style={styles.eodBtn} onPress={() => navigation.navigate('EODSummary')}>
                <Text style={styles.eodBtnText}>View EOD Summary</Text>
              </TouchableOpacity>
            }
          />
        )}

        {tab === 'payments' && (
          <FlatList
            data={pendingPayments}
            keyExtractor={item => item.uid}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <View>
                  <Text style={styles.summaryLabel}>Payments</Text>
                  <Text style={styles.summaryValue}>{pendingPayments.length}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.summaryLabel}>Total Collected</Text>
                  <Text style={[styles.summaryValue, { color: '#16a34a' }]}>₹{paymentTotal.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemCardTitle}>{item.customer_name}</Text>
                  <TouchableOpacity onPress={() => removePayment(item.uid)} style={styles.deleteBtn}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.itemCardFooter}>
                  <Text style={styles.itemCardSub}>{item.mode} â€¢ {item.invoice_no}</Text>
                  <Text style={styles.itemCardVal}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}><Text style={styles.emptyText}>No payments recorded yet</Text></View>
            }
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          if (tab === 'customers') navigation.navigate('AdHocCustomers');
          else navigation.navigate('EODSummary');
        }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userInfo: { flex: 1 },
  greeting: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8, borderRadius: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 4, borderRadius: 10 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, flexDirection: 'row', justifyContent: 'center' },
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  activeTabText: { color: '#111827', fontWeight: '600' },
  badge: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  body: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#2563eb', fontWeight: 'bold', fontSize: 16 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  customerCode: { fontSize: 13, color: '#6b7280' },
  actionCircle: { padding: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  summaryLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  itemCard: { backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemCardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  deleteBtn: { padding: 4, borderRadius: 4, backgroundColor: '#fef2f2' },
  itemCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  itemCardSub: { fontSize: 13, color: '#6b7280' },
  itemCardVal: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  eodBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  eodBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
});

