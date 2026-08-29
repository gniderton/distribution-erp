import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useTheme } from '../theme';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';

export default function CustomerDashboardScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { selectedCustomer } = useAppStore();

  const { data, isLoading } = useQuery({
    queryKey: ['customerDashboard', selectedCustomer?.id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/analytics/customers/${selectedCustomer?.id}/dashboard`);
      return res.data;
    },
    enabled: !!selectedCustomer?.id
  });

  const metrics = data?.metrics || {};
  const activity = data?.recent_activity || [];
  const brandSales = data?.brand_sales_fy || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedCustomer?.customer_name}</Text>
          <Text style={styles.headerSub}>Customer Dashboard</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Total Sales</Text>
                  {metrics.growth_sales_pct >= 0 ? <TrendingUp size={16} color={theme.success} /> : <TrendingDown size={16} color={theme.error} />}
                </View>
                <Text style={styles.metricVal}>₹{Number(metrics.total_sales || 0).toLocaleString('en-IN')}</Text>
                <Text style={[styles.metricGrowth, (metrics.growth_sales_pct < 0) && { color: theme.error }]}>
                  {metrics.growth_sales_pct >= 0 ? '+' : ''}{metrics.growth_sales_pct}% YoY
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Rank</Text>
                </View>
                <Text style={styles.metricVal}>#{metrics.sales_rank || '-'}</Text>
                <Text style={[styles.metricGrowth, { color: theme.textSecondary }]}>in territory</Text>
              </View>
            </View>

            <View style={styles.creditBox}>
              <Text style={styles.creditTitle}>Credit Summary</Text>
              
              <View style={styles.creditRow}>
                <View style={styles.creditItem}>
                  <Text style={styles.creditLabel}>Outstanding</Text>
                  <Text style={[styles.creditVal, { color: theme.error }]}>₹{Number(metrics.current_balance || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.creditItem}>
                  <Text style={styles.creditLabel}>Limit</Text>
                  <Text style={styles.creditVal}>₹{Number(metrics.credit_limit || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(100, ((metrics.current_balance || 0) / (metrics.credit_limit || 1)) * 100)}%` }]} />
              </View>

              <View style={styles.creditRow}>
                <View style={styles.creditItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <Clock size={12} color={theme.textSecondary} />
                    <Text style={styles.creditLabel}>Avg Collection</Text>
                  </View>
                  <Text style={styles.creditVal}>{metrics.avg_credit_days || 0} days</Text>
                </View>
                <View style={styles.creditItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <DollarSign size={12} color={theme.textSecondary} />
                    <Text style={styles.creditLabel}>Receivables Ratio</Text>
                  </View>
                  <Text style={styles.creditVal}>{Math.round(metrics.receivables_vs_sales_ratio * 100 || 0)}%</Text>
                </View>
              </View>
            </View>

            {/* Brand Sales */}
            {brandSales.length > 0 && (
              <View style={styles.creditBox}>
                <Text style={styles.creditTitle}>Brand Sales (FY)</Text>
                {brandSales.map((b: any, i: number) => {
                  const total = brandSales.reduce((s: number, x: any) => s + Number(x.taxable_sales), 0);
                  const pct = total > 0 ? Math.round((Number(b.taxable_sales) / total) * 100) : 0;
                  return (
                    <View key={i} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text, maxWidth: '60%' }} numberOfLines={1}>{b.brand_name}</Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary }}>₹{Number(b.taxable_sales).toLocaleString('en-IN')} ({pct}%)</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { backgroundColor: theme.primary, opacity: i === 0 ? 1 : 0.6, width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {activity.map((act: any, i: number) => {
              const isCredit = (Number(act.credit_amount) || 0) > 0;
              const amt = isCredit ? act.credit_amount : act.debit_amount;
              const dateStr = act.date ? new Date(act.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
              return (
                <View key={i} style={styles.activityCard}>
                  <View style={[styles.activityIcon, { backgroundColor: isCredit ? (theme.isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7') : (theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2') }]}>
                    {isCredit ? <TrendingUp size={16} color={theme.success} /> : <TrendingDown size={16} color={theme.error} />}
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{act.reference_number || ''} {act.type ? `(${act.type})` : ''}</Text>
                    {!!dateStr && <Text style={styles.activityDate}>{dateStr}</Text>}
                  </View>
                  <Text style={[styles.activityVal, { color: isCredit ? theme.success : theme.error }]}>
                    {isCredit ? '+' : '-'}₹{Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  headerSub: { fontSize: 12, color: theme.textSecondary },
  content: { padding: 16 },
  metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metricLabel: { fontSize: 12, color: theme.textSecondary, fontWeight: '500' },
  metricVal: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  metricGrowth: { fontSize: 12, color: theme.success },
  creditBox: { backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 24 },
  creditTitle: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 16 },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  creditItem: { flex: 1 },
  creditLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 4 },
  creditVal: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  progressBar: { height: 6, backgroundColor: theme.input, borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.error, borderRadius: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  activityIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '500', color: theme.text, marginBottom: 2 },
  activityDate: { fontSize: 12, color: theme.textSecondary },
  activityVal: { fontSize: 14, fontWeight: 'bold', color: theme.text },
});
