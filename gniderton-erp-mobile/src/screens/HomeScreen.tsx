import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserPlus, Phone, Plus, ShoppingCart, IndianRupee, Menu, Bell, TrendingUp, RefreshCw, LogOut, CheckSquare } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function HomeScreen({ navigation }: any) {
  const { currentUser, pendingOrders, pendingPayments, setSelectedCustomer, logout } = useAppStore();
  const [search, setSearch] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const { data: customers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers', currentUser?.id, 'today'],
    queryFn: async () => {
      const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const res = await axios.get(`${API_URL}/customers`, { params: { dse_id: currentUser?.id, day } });
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
    setMenuVisible(false);
    logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Hi, {currentUser?.full_name ?? currentUser?.employee_name}</Text>
          <Text style={styles.title}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('PendingOrders')} style={styles.iconBtn}>
            <ShoppingCart size={24} color="#4b5563" />
            {pendingOrders.length > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingOrders.length}</Text></View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('PendingPayments')} style={styles.iconBtn}>
            <IndianRupee size={24} color="#4b5563" />
            {pendingPayments.length > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingPayments.length}</Text></View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.iconBtn, { marginLeft: 8 }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {currentUser?.full_name?.charAt(0) || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body - Today's Route */}
      <View style={styles.body}>
        <View style={styles.searchBox}>
          <Search size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search today's route..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#2f7f74" /></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.customerCard} onPress={() => handleSelect(item)}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerAvatarText}>
                    {item.customer_name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.customer_name}</Text>
                  <Text style={styles.customerCode}>{item.customer_code} • {item.address_line1 || item.city}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  {item.contact_primary && (
                    <TouchableOpacity onPress={() => {}}>
                      <Phone size={18} color="#2f7f74" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.center}><Text style={styles.emptyText}>No customers on route today.</Text></View>
            }
          />
        )}
      </View>

      {/* Sticky Bottom Bar for EOD */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.eodBtn} onPress={() => navigation.navigate('EODSummary')}>
          <CheckSquare size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.eodBtnText}>Run End of Day</Text>
        </TouchableOpacity>
      </View>

      {/* Side Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Menu</Text>
            </View>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('AdHocCustomers'); }}>
              <UserPlus size={20} color="#4b5563" style={styles.menuIcon} />
              <Text style={styles.menuText}>Ad-Hoc Customers</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('DseDashboard'); }}>
              <TrendingUp size={20} color="#4b5563" style={styles.menuIcon} />
              <Text style={styles.menuText}>Performance Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('PriceAlerts'); }}>
              <Bell size={20} color="#4b5563" style={styles.menuIcon} />
              <Text style={styles.menuText}>Price Alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); refetch(); }}>
              {isRefetching ? <ActivityIndicator size="small" color="#4b5563" style={styles.menuIcon} /> : <RefreshCw size={20} color="#4b5563" style={styles.menuIcon} />}
              <Text style={styles.menuText}>Refresh Data</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 }} />
            
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: '#ef4444' }]}>Logout</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  userInfo: { flex: 1 },
  greeting: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef6f5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#a7d3cd' },
  avatarText: { color: '#2f7f74', fontWeight: 'bold', fontSize: 16 },
  
  body: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  customerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  customerAvatarText: { color: '#2f7f74', fontWeight: 'bold', fontSize: 16 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  customerCode: { fontSize: 13, color: '#6b7280' },

  bottomBar: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  eodBtn: { flexDirection: 'row', backgroundColor: '#2f7f74', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eodBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 16 },
  modalContent: { width: 240, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, overflow: 'hidden' },
  modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIcon: { marginRight: 12 },
  menuText: { fontSize: 15, color: '#4b5563', fontWeight: '500' }
});
