import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, Plus } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';
import { useTheme } from '../theme';

interface Bill {
  id: string
  invoice_number: string
  invoice_date: string
  grand_total: number
  amount_paid: number
  balance_amount: number
}

export default function PaymentListScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { selectedCustomer, pendingPayments, setSelectedInvoice } = useAppStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pendingBills', selectedCustomer?.id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/customers/${selectedCustomer?.id}/pending-bills`);
      return res.data;
    },
    enabled: !!selectedCustomer?.id
  });

  const bills = (Array.isArray(data) ? data : []) as Bill[];

  const offlinePaidMap = pendingPayments.reduce<Record<string, number>>((acc, p: any) => {
    if (p.invoice_id) acc[p.invoice_id] = (acc[p.invoice_id] ?? 0) + Number(p.amount);
    return acc;
  }, {});

  const selectBill = (bill: Bill) => {
    setSelectedInvoice({
      id: bill.id,
      invoice_number: bill.invoice_number,
      balance_amount: bill.balance_amount,
      grand_total: bill.grand_total,
    });
    navigation.navigate('PaymentEntry');
  };

  const goAdvance = () => {
    setSelectedInvoice(null);
    navigation.navigate('PaymentEntry');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Bills</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.iconBtn}>
          <RefreshCw size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.customerName} numberOfLines={1}>{selectedCustomer?.customer_name}</Text>
        <TouchableOpacity style={styles.advanceBtn} onPress={goAdvance}>
          <Plus size={16} color={theme.primary} />
          <Text style={styles.advanceBtnText}>Advance</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : bills.length === 0 ? (
        <View style={styles.center}><Text style={styles.emptyText}>No pending bills</Text></View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: bill }) => {
            const alreadyPaid = offlinePaidMap[bill.id] ?? 0;
            const remaining = bill.balance_amount - alreadyPaid;
            const isPaid = remaining <= 0;
            const daysOld = Math.floor((Date.now() - new Date(bill.invoice_date).getTime()) / 86400000);
            
            return (
              <TouchableOpacity 
                style={[styles.billCard, isPaid && styles.paidCard]} 
                disabled={isPaid}
                onPress={() => selectBill(bill)}
              >
                <View style={styles.billHeader}>
                  <View>
                    <Text style={styles.billNo}>{bill.invoice_number}</Text>
                    <Text style={styles.billDate}>{new Date(bill.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <View style={[styles.badge, isPaid ? styles.badgePaid : (daysOld > 30 ? styles.badgeDanger : styles.badgeWarn)]}>
                    <Text style={[styles.badgeText, isPaid ? styles.badgeTextPaid : (daysOld > 30 ? styles.badgeTextDanger : styles.badgeTextWarn)]}>
                      {isPaid ? 'Paid' : `${daysOld}d`}
                    </Text>
                  </View>
                </View>
                <View style={styles.grid}>
                  <View style={styles.col}>
                    <Text style={styles.colLabel}>Bill</Text>
                    <Text style={styles.colVal}>₹{Number(bill.grand_total).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.colLabel}>Paid</Text>
                    <Text style={[styles.colVal, { color: theme.success }]}>₹{Number(bill.amount_paid).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.colLabel}>Balance</Text>
                    <Text style={[styles.colVal, isPaid ? { color: theme.textMuted } : { color: theme.error }]}>
                      ₹{Math.max(0, remaining).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, flex: 1 },
  iconBtn: { padding: 4 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  customerName: { fontSize: 14, color: theme.textSecondary, flex: 1, marginRight: 8 },
  advanceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.input },
  advanceBtnText: { fontSize: 12, fontWeight: '600', color: theme.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: theme.textSecondary, fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 40 },
  billCard: { backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 16, marginBottom: 12 },
  paidCard: { backgroundColor: theme.input, opacity: 0.7 },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  billNo: { fontSize: 15, fontWeight: '600', color: theme.text },
  billDate: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgePaid: { backgroundColor: theme.isDark ? '#143823' : '#dcfce7' },
  badgeDanger: { backgroundColor: theme.isDark ? '#3d1a1a' : '#fee2e2' },
  badgeWarn: { backgroundColor: theme.isDark ? '#3d3014' : '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextPaid: { color: theme.success },
  badgeTextDanger: { color: theme.error },
  badgeTextWarn: { color: theme.isDark ? '#fcd34d' : '#b45309' },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1 },
  colLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  colVal: { fontSize: 13, fontWeight: 'bold', color: theme.text },
});
