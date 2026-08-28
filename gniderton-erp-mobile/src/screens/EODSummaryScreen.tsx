import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle, RefreshCw, PlusCircle, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../store';
import axios from 'axios';
import { API_URL } from '../api/config';

const EXPENSE_TYPES = ['Fuel', 'Food', 'Auto', 'Other'];
const DENOM_ROWS = [
  { key: '500', label: '500', value: 500 },
  { key: '200', label: '200', value: 200 },
  { key: '100', label: '100', value: 100 },
  { key: '50', label: '50', value: 50 },
  { key: '20', label: '20', value: 20 },
  { key: '10', label: '10', value: 10 },
  { key: 'coins', label: 'Coins', value: 1 },
];
const MAX_EXPENSE_TOTAL = 1000;

export default function EODSummaryScreen({ navigation }: any) {
  const { currentUser, pendingOrders, pendingPayments, expenses, denominations, addExpense, removeExpense, setDenom, clearEodData } = useAppStore();
  const [tab, setTab] = useState<'summary' | 'expenses' | 'cash'>('summary');
  const [syncing, setSyncing] = useState(false);

  // Expense state
  const [expType, setExpType] = useState('Fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');

  // Summaries
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const cashPayments = pendingPayments.filter(p => p.mode === 'CASH');
  const bankPayments = pendingPayments.filter(p => p.mode !== 'CASH');
  const cashTotal = cashPayments.reduce((s, p) => s + p.amount, 0);
  const bankTotal = bankPayments.reduce((s, p) => s + p.amount, 0);

  const denomTotal = DENOM_ROWS.reduce((s, r) => s + (denominations[r.key] || 0) * r.value, 0);
  const expectedCash = cashTotal;
  const cashMatch = denomTotal === expectedCash;

  const handleSync = async () => {
    if (pendingOrders.length === 0 && pendingPayments.length === 0) {
      Alert.alert('Empty', 'No offline data to sync.');
      return;
    }
    if (expectedCash > 0 && !cashMatch) {
      Alert.alert('Mismatch', 'Cash count does not match expected cash. Please verify before syncing.');
      return;
    }

    setSyncing(true);
    try {
      await axios.post(`${API_URL}/eod-sync`, {
        dse_id: currentUser?.id,
        orders: pendingOrders,
        payments: pendingPayments,
        expenses,
        denominations
      });
      clearEodData();
      Alert.alert('Success', 'End of day sync completed successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('DseDashboard') }
      ]);
    } catch (e) {
      Alert.alert('Sync Failed', 'Could not sync with the server. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddExpense = () => {
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (expenseTotal + amt > MAX_EXPENSE_TOTAL) {
      Alert.alert('Limit Exceeded', `Total expenses cannot exceed â‚¹${MAX_EXPENSE_TOTAL}`);
      return;
    }
    addExpense({ id: Date.now(), type: expType, amount: amt, desc: expDesc.trim() });
    setExpAmount('');
    setExpDesc('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EOD Sync</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'summary' && styles.tabActive]} onPress={() => setTab('summary')}>
          <Text style={[styles.tabText, tab === 'summary' && styles.tabTextActive]}>Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'expenses' && styles.tabActive]} onPress={() => setTab('expenses')}>
          <Text style={[styles.tabText, tab === 'expenses' && styles.tabTextActive]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'cash' && styles.tabActive]} onPress={() => setTab('cash')}>
          <Text style={[styles.tabText, tab === 'cash' && styles.tabTextActive]}>Cash Count</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {tab === 'summary' && (
          <View style={styles.tabContent}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Offline Orders</Text>
                <Text style={styles.statValue}>{pendingOrders.length}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Payments</Text>
                <Text style={styles.statValue}>{pendingPayments.length}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Cash Collected</Text>
                <Text style={styles.statValue}>â‚¹{cashTotal}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Bank/Online</Text>
                <Text style={styles.statValue}>â‚¹{bankTotal}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
              {syncing ? <ActivityIndicator color="#fff" /> : <RefreshCw size={20} color="#fff" style={{ marginRight: 8 }} />}
              <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'expenses' && (
          <View style={styles.tabContent}>
            <View style={styles.expenseForm}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {EXPENSE_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, expType === t && styles.typeBtnActive]} onPress={() => setExpType(t)}>
                    <Text style={[styles.typeBtnText, expType === t && styles.typeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Amount</Text>
              <TextInput style={styles.input} value={expAmount} onChangeText={setExpAmount} keyboardType="numeric" placeholder="0" />

              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={expDesc} onChangeText={setExpDesc} placeholder="e.g. Lunch" />

              <TouchableOpacity style={styles.addBtn} onPress={handleAddExpense}>
                <PlusCircle size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.addBtnText}>Save Expense</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.expenseList}>
              <Text style={styles.expenseListTitle}>Added Expenses (Total: â‚¹{expenseTotal})</Text>
              {expenses.map(e => (
                <View key={e.id} style={styles.expenseRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseType}>{e.type}</Text>
                    {!!e.desc && <Text style={styles.expenseDesc}>{e.desc}</Text>}
                  </View>
                  <Text style={styles.expenseAmount}>â‚¹{e.amount}</Text>
                  <TouchableOpacity onPress={() => removeExpense(e.id)} style={styles.deleteBtn}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {tab === 'cash' && (
          <View style={styles.tabContent}>
            <Text style={styles.helperText}>Enter number of notes/coins collected in cash</Text>
            {DENOM_ROWS.map(row => (
              <View key={row.key} style={styles.denomRow}>
                <Text style={styles.denomLabel}>{row.label}</Text>
                <TextInput
                  style={styles.denomInput}
                  value={String(denominations[row.key] || '')}
                  onChangeText={v => setDenom(row.key, parseInt(v) || 0)}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <Text style={styles.denomTotal}>= â‚¹{((denominations[row.key] || 0) * row.value)}</Text>
              </View>
            ))}

            <View style={styles.denomSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Expected Cash</Text>
                <Text style={styles.summaryValue}>â‚¹{expectedCash}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cash Counted</Text>
                <Text style={[styles.summaryValue, { fontWeight: 'bold' }]}>â‚¹{denomTotal}</Text>
              </View>
              <Text style={[styles.matchText, { color: cashMatch ? '#16a34a' : '#dc2626' }]}>
                {cashMatch ? 'âœ“ Cash Matched' : `âœ• Difference: â‚¹${Math.abs(denomTotal - expectedCash)}`}
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { marginRight: 12, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#2f7f74' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#2f7f74', fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 40 },
  tabContent: { flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2f7f74', padding: 16, borderRadius: 12 },
  syncBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  expenseForm: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 6, marginTop: 12 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#f3f4f6' },
  typeBtnActive: { backgroundColor: '#2f7f74' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  typeBtnTextActive: { color: '#fff' },
  input: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2f7f74', padding: 12, borderRadius: 8, marginTop: 16 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  expenseList: { marginTop: 8 },
  expenseListTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  expenseType: { fontSize: 14, fontWeight: '600', color: '#111827' },
  expenseDesc: { fontSize: 12, color: '#6b7280' },
  expenseAmount: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginRight: 12 },
  deleteBtn: { padding: 4 },
  helperText: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  denomRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  denomLabel: { width: 50, fontSize: 15, fontWeight: 'bold', color: '#111827' },
  denomInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, height: 40, textAlign: 'center', fontSize: 15, fontWeight: 'bold' },
  denomTotal: { width: 80, textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: '#111827' },
  denomSummary: { backgroundColor: '#eef6f5', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#a7d3cd', marginTop: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#4d9e92' },
  summaryValue: { fontSize: 16, color: '#111827' },
  matchText: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#a7d3cd', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }
});
