import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';
import { useTheme } from '../theme';

interface PriceAlert {
  product_name: string;
  old_mrp: number;
  new_mrp: number;
  mrp_change_percentage: number;
  selling_prices?: {
    dealer_rate: number;
    wholesale_rate: number;
  };
  effective_date?: string;
  brand_name?: string;
}

export default function PriceAlertsScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['priceAlerts'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/analytics/price-alerts`);
      return res.data;
    }
  });

  const alerts: PriceAlert[] = useMemo(() => {
    const raw = data?.alerts;
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const increases = alerts.filter(a => a.mrp_change_percentage > 0);
  const decreases = alerts.filter(a => a.mrp_change_percentage <= 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Changes</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.iconBtn}>
          {isRefetching ? <ActivityIndicator size="small" color={theme.textSecondary} /> : <RefreshCw size={20} color={theme.textSecondary} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && alerts.length === 0 ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : alerts.length === 0 ? (
          <View style={styles.emptyBox}>
            <AlertCircle size={48} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No price changes</Text>
            <Text style={styles.emptySub}>All product prices are up to date</Text>
          </View>
        ) : (
          <View style={styles.list}>
            <View style={styles.summaryRow}>
              {increases.length > 0 && (
                <View style={[styles.summaryCard, { backgroundColor: theme.isDark ? '#3d1a1a' : '#fef2f2', borderColor: theme.isDark ? '#5c2222' : '#fecaca' }]}>
                  <Text style={[styles.summaryNum, { color: theme.error }]}>{increases.length}</Text>
                  <Text style={[styles.summaryText, { color: theme.error }]}>Increase{increases.length !== 1 ? 's' : ''}</Text>
                </View>
              )}
              {decreases.length > 0 && (
                <View style={[styles.summaryCard, { backgroundColor: theme.isDark ? '#143823' : '#f0fdf4', borderColor: theme.isDark ? '#235937' : '#bbf7d0' }]}>
                  <Text style={[styles.summaryNum, { color: theme.success }]}>{decreases.length}</Text>
                  <Text style={[styles.summaryText, { color: theme.success }]}>Decrease{decreases.length !== 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>

            {alerts.map((alert, i) => {
              const increased = alert.mrp_change_percentage > 0;
              const pct = Math.abs(alert.mrp_change_percentage);
              
              return (
                <View key={i} style={styles.alertCard}>
                  <View style={[styles.cardTopStrip, { backgroundColor: increased ? theme.error : theme.success }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardInfo}>
                        <Text style={styles.prodName}>{alert.product_name}</Text>
                        {!!alert.brand_name && <Text style={styles.brandName}>{alert.brand_name}</Text>}
                      </View>
                      <View style={[styles.badge, { backgroundColor: increased ? (theme.isDark ? '#3d1a1a' : '#fee2e2') : (theme.isDark ? '#143823' : '#dcfce7') }]}>
                        {increased ? <TrendingUp size={12} color={theme.error} /> : <TrendingDown size={12} color={theme.success} />}
                        <Text style={[styles.badgeText, { color: increased ? theme.error : theme.success }]}>
                          {increased ? '+' : '-'}{pct}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.mrpRow}>
                      <View style={styles.mrpBox}>
                        <Text style={styles.mrpLabel}>Old MRP</Text>
                        <Text style={styles.mrpValOld}>₹{Number(alert.old_mrp).toFixed(2)}</Text>
                      </View>
                      <Text style={styles.arrow}>→</Text>
                      <View style={[styles.mrpBox, { backgroundColor: increased ? (theme.isDark ? '#3d1a1a' : '#fef2f2') : (theme.isDark ? '#143823' : '#f0fdf4') }]}>
                        <Text style={styles.mrpLabel}>New MRP</Text>
                        <Text style={[styles.mrpValNew, { color: increased ? theme.error : theme.success }]}>
                          ₹{Number(alert.new_mrp).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: theme.text },
  iconBtn: { padding: 4 },
  content: { padding: 16 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.textSecondary },
  emptySub: { fontSize: 14, color: theme.textMuted },
  list: { gap: 16 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: 'bold' },
  summaryText: { fontSize: 12 },
  alertCard: { backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  cardTopStrip: { height: 4, width: '100%' },
  cardBody: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1, paddingRight: 8 },
  prodName: { fontSize: 14, fontWeight: '600', color: theme.text, lineHeight: 20 },
  brandName: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  mrpRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mrpBox: { flex: 1, backgroundColor: theme.input, padding: 10, borderRadius: 8, alignItems: 'center' },
  mrpLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 4 },
  mrpValOld: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  mrpValNew: { fontSize: 16, fontWeight: 'bold' },
  arrow: { fontSize: 16, fontWeight: 'bold', color: theme.textMuted },
});
