import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle, RefreshCw, PlusCircle, Trash2, ArrowRight } from 'lucide-react-native';
import { useAppStore } from '../store';
import axios from 'axios';
import { API_URL } from '../api/config';

const EXPENSE_TYPES = ['Petrol', 'Food', 'Drinks', 'Auto / Taxi', 'Other'];
const DENOM_ROWS = [
  { key: '500', label: '500', value: 500 },
  { key: '200', label: '200', value: 200 },
  { key: '100', label: '100', value: 100 },
  { key: '50', label: '50', value: 50 },
  { key: '20', label: '20', value: 20 },
  { key: '10', label: '10', value: 10 },
  { key: 'coins', label: 'Coins', value: 1 },
];
const MAX_EXPENSE_TOTAL = 300;

export default function EODSummaryScreen({ navigation }: any) {
  const { currentUser, pendingOrders, pendingPayments, expenses, denominations, addExpense, removeExpense, setDenom, clearEodData } = useAppStore();
  const [step, setStep] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  // Expense state
  const [expType, setExpType] = useState('Petrol');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');

  // Cheque state
  const [chequeInputs, setChequeInputs] = useState<Record<string, string>>({});

  // Summaries
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const cashPayments = pendingPayments.filter(p => p.mode === 'CASH');
  const chequePayments = pendingPayments.filter(p => p.mode === 'CHEQUE');
  const onlinePayments = pendingPayments.filter(p => p.mode === 'UPI' || p.mode === 'NEFT');
  const cashTotal = cashPayments.reduce((s, p) => s + p.amount, 0);
  const chequeTotal = chequePayments.reduce((s, p) => s + p.amount, 0);
  const onlineTotal = onlinePayments.reduce((s, p) => s + p.amount, 0);

  const denomTotal = DENOM_ROWS.reduce((s, r) => s + (denominations[r.key as keyof typeof denominations] || 0) * r.value, 0);
  const expectedCash = Math.max(0, cashTotal - expenseTotal);
  const cashMatch = denomTotal === expectedCash;
  const hasData = pendingOrders.length > 0 || pendingPayments.length > 0 || expenses.length > 0;

  // Group Cheques
  const groupedCheques = Object.values(
    chequePayments.reduce((acc, p) => {
      const key = `${p.customer_id}_${p.bank_name}_${p.reference}_${p.cheque_date}`;
      if (!acc[key]) {
        acc[key] = { key, customer_name: p.customer_name, bank_name: p.bank_name, cheque_no: p.reference, cheque_date: p.cheque_date, expected_amount: 0, invoices: [] };
      }
      acc[key].expected_amount += Number(p.amount);
      acc[key].invoices.push(p.invoice_no);
      return acc;
    }, {} as Record<string, any>)
  );

  const productSummary = Object.values(
    pendingOrders.reduce((acc, order) => {
      (order.items || []).forEach(item => {
        const id = item.product_id || item.id;
        const name = item.product_name || 'Unknown Product';
        const qty = item.qty || 0;
        const val = qty * Number(item.rate || 0);
        if (!acc[id]) acc[id] = { name, qty: 0, value: 0 };
        acc[id].qty += qty;
        acc[id].value += val;
      });
      return acc;
    }, {} as Record<string, { name: string; qty: number; value: number }>)
  ).sort((a, b) => b.value - a.value);

  const orderTotal = productSummary.reduce((s, p) => s + p.value, 0);

  const chequesMatch = groupedCheques.every(c => Number(chequeInputs[c.key] || 0) === c.expected_amount);

  const handleAddExpense = () => {
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (expenseTotal + amt > MAX_EXPENSE_TOTAL) {
      Alert.alert('Limit Exceeded', `Total expenses cannot exceed ₹${MAX_EXPENSE_TOTAL}.`);
      return;
    }
    if (expenseTotal + amt > cashTotal) {
      Alert.alert('Not enough cash', `Total expenses cannot exceed the collected cash (₹${cashTotal}).`);
      return;
    }
    addExpense({ id: Date.now(), type: expType, amount: amt, desc: expDesc.trim() });
    setExpAmount('');
    setExpDesc('');
  };

  const handleSync = async () => {
    if (pendingOrders.length === 0 && pendingPayments.length === 0 && expenses.length === 0) {
      Alert.alert('Empty', 'No offline data to sync.');
      return;
    }
    setSyncing(true);
    try {
      const payload = { pendingOrders, pendingPayments, expenses, denominations, dse_id: currentUser?.id };
      await axios.post(API_URL + '/dse/eod-sync', payload);
      setSynced(true);
      setTimeout(() => {
        clearEodData();
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }, 2000);
    } catch (err) {
      Alert.alert('Sync Failed', 'Please check your connection and try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (synced) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <CheckCircle size={64} color="#16a34a" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Sync Successful!</Text>
        <Text style={{ color: '#6b7280', marginTop: 8 }}>All data uploaded. Returning to home...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>End of Day (Step {step}/4)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>1. Record Expenses</Text>
            <Text style={styles.stepDesc}>Enter any expenses incurred today (Max ₹{MAX_EXPENSE_TOTAL})</Text>

            {cashTotal === 0 ? (
              <View style={[styles.infoBox, { marginBottom: 16 }]}>
                <Text style={styles.infoBoxText}>No cash collected today. Expenses cannot be claimed.</Text>
              </View>
            ) : (
              <View style={styles.expenseForm}>
                <Text style={styles.label}>Category</Text>
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
                <TextInput style={styles.input} value={expDesc} onChangeText={setExpDesc} placeholder="e.g. Lunch with client" />

                <TouchableOpacity style={styles.addBtn} onPress={handleAddExpense}>
                  <PlusCircle size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.addBtnText}>Save Expense</Text>
                </TouchableOpacity>
              </View>
            )}

            {expenses.length > 0 && (
              <View style={styles.expenseList}>
                <Text style={styles.expenseListTitle}>Added Expenses (Total: ₹{expenseTotal})</Text>
                {expenses.map(e => (
                  <View key={e.id} style={styles.expenseRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expenseType}>{e.type}</Text>
                      {!!e.desc && <Text style={styles.expenseDesc}>{e.desc}</Text>}
                    </View>
                    <Text style={styles.expenseAmount}>₹{e.amount}</Text>
                    <TouchableOpacity onPress={() => removeExpense(e.id)} style={styles.deleteBtn}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
              <Text style={styles.nextBtnText}>{expenses.length > 0 ? 'Continue to Cash' : 'No Expenses, Continue'}</Text>
              <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>2. Cash Count</Text>
            <Text style={styles.stepDesc}>Verify the physical cash collected against system records.</Text>

            {expectedCash === 0 ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>No cash expected to be deposited today.</Text>
              </View>
            ) : (
              <>
                {DENOM_ROWS.map(row => (
                  <View key={row.key} style={styles.denomRow}>
                    <Text style={styles.denomLabel}>{row.label}</Text>
                    <TextInput
                      style={styles.denomInput}
                      value={String(denominations[row.key as keyof typeof denominations] || '')}
                      onChangeText={v => setDenom(row.key as keyof typeof denominations, parseInt(v) || 0)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <Text style={styles.denomTotal}>= ₹{((denominations[row.key as keyof typeof denominations] || 0) * row.value)}</Text>
                  </View>
                ))}
                <View style={styles.denomSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Expected Cash (Sales - Expenses)</Text>
                    <Text style={styles.summaryValue}>₹{expectedCash}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Cash Counted</Text>
                    <Text style={[styles.summaryValue, { fontWeight: 'bold' }]}>₹{denomTotal}</Text>
                  </View>
                  <Text style={[styles.matchText, { color: cashMatch ? '#16a34a' : '#dc2626' }]}>
                    {cashMatch ? '✓ Cash Matched' : `✗ Difference: ₹${Math.abs(denomTotal - expectedCash)}`}
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity 
              style={[styles.nextBtn, (expectedCash > 0 && !cashMatch) && styles.btnDisabled]} 
              onPress={() => setStep(3)}
              disabled={expectedCash > 0 && !cashMatch}
            >
              <Text style={styles.nextBtnText}>Continue to Cheques</Text>
              <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>3. Cheque Verification</Text>
            <Text style={styles.stepDesc}>Type the exact amount written on each physical cheque to verify it.</Text>

            {groupedCheques.length === 0 ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>No cheques collected today.</Text>
              </View>
            ) : (
              <>
                {groupedCheques.map(c => {
                  const entered = Number(chequeInputs[c.key] || 0);
                  const isMatch = entered === c.expected_amount;
                  const hasInput = !!chequeInputs[c.key];

                  return (
                    <View key={c.key} style={[styles.chequeCard, hasInput && (isMatch ? styles.chequeCardMatch : styles.chequeCardError)]}>
                      <View style={styles.chequeHeader}>
                        <Text style={styles.chequeTitle}>{c.customer_name}</Text>
                      </View>
                      <Text style={styles.chequeBank}>{c.bank_name}</Text>
                      <Text style={styles.chequeDetail}>No: {c.cheque_no} • {c.cheque_date}</Text>
                      <Text style={styles.chequeDetail}>For invoices: {c.invoices.join(', ')}</Text>
                      
                      <View style={styles.chequeInputRow}>
                        <Text style={styles.chequeInputLabel}>Amount on Cheque (₹)</Text>
                        <TextInput
                          style={styles.chequeInput}
                          value={chequeInputs[c.key] || ''}
                          onChangeText={v => setChequeInputs(prev => ({ ...prev, [c.key]: v }))}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>
                      {hasInput && !isMatch && (
                        <Text style={styles.chequeErrorText}>Amount entered does not match system total (₹{c.expected_amount}). Please go back to Customer profile, delete the wrong payment, and re-enter if incorrect.</Text>
                      )}
                      {hasInput && isMatch && (
                        <Text style={styles.chequeMatchText}>✓ Amount Matched</Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            <TouchableOpacity 
              style={[styles.nextBtn, (!chequesMatch && groupedCheques.length > 0) && styles.btnDisabled]} 
              onPress={() => setStep(4)}
              disabled={!chequesMatch && groupedCheques.length > 0}
            >
              <Text style={styles.nextBtnText}>Continue to Summary</Text>
              <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>4. Final Summary</Text>
            <Text style={styles.stepDesc}>Review today's activity before syncing.</Text>

            {/* Orders Taken */}
            <View style={styles.summarySection}>
              <View style={styles.summarySectionHeader}>
                <Text style={styles.summarySectionTitle}>Orders Taken</Text>
                <Text style={styles.summarySectionSub}>
                  {pendingOrders.length} order{pendingOrders.length !== 1 ? 's' : ''} • ₹{orderTotal.toLocaleString('en-IN')}
                </Text>
              </View>
              {productSummary.length === 0 ? (
                <Text style={styles.emptyText}>No orders yet</Text>
              ) : (
                <>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCol, { flex: 2 }]}>Product</Text>
                    <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Qty</Text>
                    <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Value</Text>
                  </View>
                  {productSummary.map((p, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{p.name}</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: '#6b7280' }]}>{p.qty}</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '500' }]}>₹{p.value.toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                  <View style={styles.tableFooter}>
                    <Text style={[styles.tableFooterCell, { flex: 2 }]}>Total</Text>
                    <Text style={[styles.tableFooterCell, { flex: 1, textAlign: 'right' }]}>{productSummary.reduce((s, p) => s + p.qty, 0)}</Text>
                    <Text style={[styles.tableFooterCell, { flex: 1, textAlign: 'right' }]}>₹{orderTotal.toLocaleString('en-IN')}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Payments Collected */}
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Payments Collected</Text>
              <View style={{ marginTop: 8 }}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Cash</Text>
                  <Text style={styles.summaryValue}>₹{cashTotal.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Cheque</Text>
                  <Text style={styles.summaryValue}>₹{chequeTotal.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Online (UPI/NEFT)</Text>
                  <Text style={styles.summaryValue}>₹{onlineTotal.toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 8 }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: 'bold', color: '#111827' }]}>Total</Text>
                  <Text style={[styles.summaryValue, { fontWeight: 'bold' }]}>₹{(cashTotal + chequeTotal + onlineTotal).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>

            {/* Expenses */}
            <View style={styles.summarySection}>
              <View style={styles.summarySectionHeader}>
                <Text style={styles.summarySectionTitle}>Expenses</Text>
                <Text style={styles.summarySectionSub}>
                  {expenses.length} entrie{expenses.length !== 1 ? 's' : ''} • ₹{expenseTotal.toLocaleString('en-IN')}
                </Text>
              </View>
              {expenses.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {expenses.map(e => (
                    <View key={e.id} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{e.type} - {e.desc}</Text>
                      <Text style={styles.summaryValue}>₹{e.amount}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.syncBtn, (!hasData || syncing) && styles.btnDisabled]} onPress={handleSync} disabled={syncing || !hasData}>
              {syncing ? <ActivityIndicator color="#fff" /> : <RefreshCw size={20} color="#fff" style={{ marginRight: 8 }} />}
              <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync to Server'}</Text>
            </TouchableOpacity>
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
  content: { padding: 16, paddingBottom: 40 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  stepDesc: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  
  expenseForm: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 6, marginTop: 12 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#f3f4f6' },
  typeBtnActive: { backgroundColor: '#2f7f74' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  typeBtnTextActive: { color: '#fff' },
  input: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2f7f74', padding: 12, borderRadius: 8, marginTop: 16 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  expenseList: { marginTop: 8, marginBottom: 24 },
  expenseListTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  expenseType: { fontSize: 14, fontWeight: '600', color: '#111827' },
  expenseDesc: { fontSize: 12, color: '#6b7280' },
  expenseAmount: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginRight: 12 },
  deleteBtn: { padding: 4 },

  denomRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  denomLabel: { width: 50, fontSize: 15, fontWeight: 'bold', color: '#111827' },
  denomInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, height: 40, textAlign: 'center', fontSize: 15, fontWeight: 'bold' },
  denomTotal: { width: 80, textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: '#111827' },
  denomSummary: { backgroundColor: '#eef6f5', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#a7d3cd', marginTop: 16, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#4d9e92' },
  summaryValue: { fontSize: 16, color: '#111827' },
  matchText: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#a7d3cd', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },

  chequeCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  chequeCardMatch: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  chequeCardError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  chequeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chequeTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  chequeBank: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chequeDetail: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  chequeInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  chequeInputLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  chequeInput: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, height: 40, width: 120, textAlign: 'right', fontSize: 15, fontWeight: 'bold' },
  chequeErrorText: { color: '#dc2626', fontSize: 12, marginTop: 8, fontWeight: '500' },
  chequeMatchText: { color: '#16a34a', fontSize: 12, marginTop: 8, fontWeight: 'bold', textAlign: 'right' },

  infoBox: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 24 },
  infoBoxText: { color: '#1e3a8a', fontSize: 14, fontWeight: '500', textAlign: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },

  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', padding: 16, borderRadius: 12 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },

  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2f7f74', padding: 16, borderRadius: 12 },
  syncBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  summarySection: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  summarySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summarySectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  summarySectionSub: { fontSize: 12, color: '#6b7280' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8, marginBottom: 8 },
  tableCol: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tableRow: { flexDirection: 'row', marginBottom: 8 },
  tableCell: { fontSize: 13, color: '#111827' },
  tableFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 4 },
  tableFooterCell: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
  emptyText: { fontSize: 13, color: '#6b7280', fontStyle: 'italic', marginTop: 8 }
});
