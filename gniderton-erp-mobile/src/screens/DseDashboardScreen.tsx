import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw, Users, ArrowRight, LogOut } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';

function MetricCard({ label, value, sub, color }: { label: string, value: string, sub?: string, color?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, color ? { color } : null]}>{value}</Text>
      {sub && <Text style={styles.cardSub}>{sub}</Text>}
    </View>
  );
}

export default function DseDashboardScreen({ navigation }: any) {
  const currentUser = useAppStore(state => state.currentUser);
  const setUser = useAppStore(state => state.setUser);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dse-dashboard', currentUser?.id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/analytics/employees/${currentUser?.id}/dashboard`);
      return res.data;
    },
    enabled: !!currentUser?.id
  });

  const handleLogout = () => {
    setUser(null);
    navigation.replace('Login');
  };

  const dash = data;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {currentUser?.name || 'DSE'}</Text>
          <Text style={styles.title}>My Dashboard</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => refetch()} style={styles.iconBtn}>
            <RefreshCw size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
            <LogOut size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading || isRefetching ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2f7f74" />
          </View>
        ) : !dash ? (
          <View style={styles.center}>
            <Text style={{ color: '#6b7280' }}>No data available</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            
            {/* Sales & Collection */}
            <View style={styles.row}>
              <View style={styles.flex1}>
                <MetricCard 
                  label="Net Sales (Month)" 
                  value={`â‚¹${((dash.metrics?.month?.net_sales_taxable || 0) / 1000).toFixed(1)}K`}
                  sub={`${dash.metrics?.growth_sales_pct || 0}% vs last month`}
                  color="#2563eb"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={styles.flex1}>
                <MetricCard 
                  label="Collections" 
                  value={`â‚¹${((dash.metrics?.month?.collection || 0) / 1000).toFixed(1)}K`}
                  sub={`${dash.metrics?.growth_collection_pct || 0}% vs last month`}
                  color="#16a34a"
                />
              </View>
            </View>

            {/* Productivity */}
            <View style={styles.row}>
              <View style={styles.flex1}>
                <MetricCard 
                  label="Active" 
                  value={`${dash.productivity?.active_customers || 0}/${dash.productivity?.total_assigned_customers || 0}`}
                />
              </View>
              <View style={{ width: 8 }} />
              <View style={styles.flex1}>
                <MetricCard 
                  label="Coverage" 
                  value={`${dash.productivity?.market_coverage_pct || 0}%`}
                  color="#d97706"
                />
              </View>
              <View style={{ width: 8 }} />
              <View style={styles.flex1}>
                <MetricCard 
                  label="Avg Credit" 
                  value={String(dash.metrics?.month?.avg_credit_days || 0)}
                  sub="days"
                />
              </View>
            </View>

            {/* Top Customers */}
            {(dash.top_customers?.length || 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Customers</Text>
                {dash.top_customers.slice(0, 5).map((c: any, i: number) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.listTextMain} numberOfLines={1}>{c.customer_name}</Text>
                    <Text style={styles.listTextVal}>â‚¹{Number(c.taxable_sales).toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Unvisited Today */}
            {(dash.zero_billing?.length || 0) > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Users size={16} color="#ef4444" />
                  <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Unvisited Today</Text>
                </View>
                {dash.zero_billing.slice(0, 5).map((c: any, i: number) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.listTextMain} numberOfLines={1}>{c.customer_name}</Text>
                    <Text style={styles.listTextSub}>{c.last_invoice_date ? `Last: ${c.last_invoice_date}` : 'Never'}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.actionBtnText}>Go to Customers</Text>
              <ArrowRight size={18} color="#111827" />
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  greeting: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 20 },
  scrollContent: { padding: 16 },
  center: { padding: 40, alignItems: 'center' },
  gridContainer: { gap: 16 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  cardSub: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  section: { marginTop: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  listTextMain: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  listTextVal: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  listTextSub: { fontSize: 12, color: '#6b7280' },
  actionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 16 },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#111827', marginRight: 8 }
});
