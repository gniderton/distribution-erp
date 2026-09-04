import React, { useState } from 'react';
import { useTheme } from '../theme';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Modal, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserPlus, Phone, Plus, ShoppingCart, IndianRupee, Menu, Bell, TrendingUp, RefreshCw, LogOut, CheckSquare, Moon, Sun, Droplet, MapPin, SortAsc, CheckCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/geo';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const { currentUser, pendingOrders, pendingPayments, setSelectedCustomer, setUser, activeTheme, setActiveTheme } = useAppStore();

  const [search, setSearch] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState('alpha');
  const [currentLoc, setCurrentLoc] = useState({ lat: 0, lng: 0 });

  const { data: customers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers', currentUser?.id, 'today'],
    queryFn: async () => {
      const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const res = await axios.get(`${API_URL}/customers`, { params: { dse_id: currentUser?.id, day } });
      return res.data;
    },
    enabled: !!currentUser?.id
  });


  const filtered = (customers || [])
    .filter((c: any) => 
      (c.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_code || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortOrder === 'visit' && currentLoc.lat !== 0) {
        const aLat = a.latitude || a.location_lat;
        const aLng = a.longitude || a.location_lng;
        const bLat = b.latitude || b.location_lat;
        const bLng = b.longitude || b.location_lng;
        const distA = (aLat && aLng) ? calculateDistance(currentLoc.lat, currentLoc.lng, Number(aLat), Number(aLng)) : 9999999;
        const distB = (bLat && bLng) ? calculateDistance(currentLoc.lat, currentLoc.lng, Number(bLat), Number(bLng)) : 9999999;
        return distA - distB;
      } else {
        return (a.customer_name || '').localeCompare(b.customer_name || '');
      }
    });

  const toggleSort = async () => {
    if (sortOrder === 'alpha') {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setCurrentLoc({ lat: location.coords.latitude, lng: location.coords.longitude });
          setSortOrder('visit');
        } else {
          Alert.alert('Permission denied', 'Cannot sort by visit order without location access.');
        }
      } catch (err) {
        console.log('Location fetch failed:', err);
      }
    } else {
      setSortOrder('alpha');
    }
  };

  const handleSelect = (customer: any) => {
    setSelectedCustomer(customer);
    navigation.navigate('CustomerHub');
  };

  const handleLogout = () => {
    setMenuVisible(false);
    setUser(null);
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
        <View style={{ flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8 }}>
          <View style={[styles.searchBox, { margin: 0, marginBottom: 0, flex: 1 }]}>
            <Search size={18} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search today's route..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <TouchableOpacity 
            style={{ marginLeft: 8, padding: 10, backgroundColor: sortOrder === 'visit' ? theme.primary : theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border }} 
            onPress={toggleSort}
          >
            <SortAsc size={20} color={sortOrder === 'visit' ? '#fff' : theme.text} />
          </TouchableOpacity>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                    <Text style={styles.customerName}>{item.customer_name}</Text>
                    {item.is_verified || item.verification_status === 'Verified' ? (
                      <CheckCircle size={14} color="#16a34a" />
                    ) : (
                      <View style={{ backgroundColor: '#fffbeb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fde68a' }}>
                        <Text style={{ fontSize: 9, color: '#b45309', fontWeight: 'bold' }}>PENDING</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.customerCode}>{item.customer_code} • {item.address_line1 || item.city}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  {(item.latitude || item.location_lat) && (item.longitude || item.location_lng) && (
                    <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.latitude || item.location_lat},${item.longitude || item.location_lng}`)} style={{ padding: 8, backgroundColor: theme.isDark ? '#1e293b' : '#eff6ff', borderRadius: 8 }}>
                      <MapPin size={18} color={theme.isDark ? '#60a5fa' : '#1d4ed8'} />
                    </TouchableOpacity>
                  )}
                  {(item.customer_phone || item.contact_primary) && (
                    <TouchableOpacity onPress={() => Linking.openURL('tel:' + (item.customer_phone || item.contact_primary))} style={{ padding: 8, backgroundColor: theme.isDark ? '#14532d' : '#f0fdf4', borderRadius: 8 }}>
                      <Phone size={18} color={theme.isDark ? '#4ade80' : '#15803d'} />
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

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { flexDirection: 'row', gap: 12 }]}>
        <TouchableOpacity style={[styles.eodBtn, { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]} onPress={() => navigation.navigate('RouteBriefing')}>
          <CheckSquare size={20} color={theme.text} style={{ marginRight: 8 }} />
          <Text style={[styles.eodBtnText, { color: theme.text }]}>Plan Tomorrow</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.eodBtn, { flex: 1 }]} onPress={() => navigation.navigate('EODSummary')}>
          <CheckSquare size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.eodBtnText}>End of Day</Text>
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
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('CustomerHub'); }}>
              <Search size={20} color={theme.textSecondary} style={styles.menuIcon} />
              <Text style={styles.menuText}>Search Network</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              const nextTheme = activeTheme === 'light' ? 'dark' : (activeTheme === 'dark' ? 'glass' : 'light');
              setActiveTheme(nextTheme);
            }}>
              {activeTheme === 'light' ? (
                <Moon size={20} color={theme.textSecondary} style={styles.menuIcon} />
              ) : activeTheme === 'dark' ? (
                <Droplet size={20} color={theme.textSecondary} style={styles.menuIcon} />
              ) : (
                <Sun size={20} color={theme.textSecondary} style={styles.menuIcon} />
              )}
              <Text style={styles.menuText}>
                Theme: {activeTheme.charAt(0).toUpperCase() + activeTheme.slice(1)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('PriceAlerts'); }}>
              <Bell size={20} color="#4b5563" style={styles.menuIcon} />
              <Text style={styles.menuText}>Price Alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); refetch(); }}>
              {isRefetching ? <ActivityIndicator size="small" color="#4b5563" style={styles.menuIcon} /> : <RefreshCw size={20} color="#4b5563" style={styles.menuIcon} />}
              <Text style={styles.menuText}>Refresh Data</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />
            
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: theme.error }]}>Logout</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  userInfo: { flex: 1 },
  greeting: { fontSize: 13, color: theme.textSecondary, marginBottom: 2 },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: theme.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: theme.card },
  badgeText: { color: theme.card, fontSize: 10, fontWeight: 'bold' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef6f5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#a7d3cd' },
  avatarText: { color: theme.primary, fontWeight: 'bold', fontSize: 16 },
  
  body: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, margin: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: theme.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: theme.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: theme.textSecondary, fontSize: 14, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  customerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.input, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  customerAvatarText: { color: theme.primary, fontWeight: 'bold', fontSize: 16 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 2 },
  customerCode: { fontSize: 13, color: theme.textSecondary },

  bottomBar: { padding: 16, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border },
  eodBtn: { flexDirection: 'row', backgroundColor: theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eodBtnText: { color: theme.card, fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 16 },
  modalContent: { width: 240, backgroundColor: theme.card, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, overflow: 'hidden' },
  modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIcon: { marginRight: 12 },
  menuText: { fontSize: 15, color: theme.textSecondary, fontWeight: '500' }
});
