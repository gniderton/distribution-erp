import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckSquare, RefreshCw, X } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';

const MODES = ['CASH', 'CHEQUE', 'UPI', 'NEFT'];

function genPaymentId() {
  return 'PAY-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
}

export default function PaymentEntryScreen({ navigation }: any) {
  const { currentUser, selectedCustomer, pendingPayments, addPayment, selectedInvoice } = useAppStore();
  const [mode, setMode] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  const [showBankModal, setShowBankModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const { data: banksData, refetch: refetchBanks } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => { const res = await axios.get(API_URL + '/master/banks'); return res.data; }
  });
  const banks = banksData || [];

  const { data: creditsData, refetch: refetchCredits } = useQuery({
    queryKey: ['unconsumedCredits'],
    queryFn: async () => { const res = await axios.get(API_URL + '/finance/reconciliation/bank/unconsumed-credits'); return res.data; }
  });
  const credits = creditsData || [];

  if (!selectedCustomer) {
    setTimeout(() => navigation.goBack(), 0);
    return null;
  }

  const isAdvance = !selectedInvoice;
  const isCheque = mode === 'CHEQUE';
  const isOnline = mode === 'UPI' || mode === 'NEFT';

  const alreadyPaidOffline = (pendingPayments || []).reduce((sum, p: any) => {
    if (p.invoice_id === selectedInvoice?.id) return sum + Number(p.amount);
    return sum;
  }, 0);

  const remainingBalance = selectedInvoice ? (selectedInvoice.balance_amount - alreadyPaidOffline) : Infinity;

  const numAmt = parseFloat(amount);
  const canSave = !isNaN(numAmt) && numAmt > 0 &&
    (isAdvance || numAmt <= remainingBalance + 0.01) &&
    (isCheque ? !!(reference.trim() && bankName.trim() && chequeDate.trim()) : true) &&
    (isOnline ? !!reference.trim() : true);

  const handleSave = () => {
    if (!canSave) return;
    
    if (!isAdvance && numAmt > remainingBalance + 0.01) {
      Alert.alert('Error', `Amount exceeds remaining balance: ₹${remainingBalance.toFixed(2)}`);
      return;
    }

    const payment = {
      uid: genPaymentId(),
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.customer_name,
      dse_id: currentUser?.id || 'UNK',
      timestamp: new Date().toISOString(),
      amount: numAmt,
      mode,
      invoice_id: selectedInvoice?.id,
      invoice_no: selectedInvoice?.invoice_number || 'ADVANCE',
      reference: reference.trim(),
      bank_name: bankName.trim(),
      cheque_date: chequeDate.trim(),
      is_advance: isAdvance
    };

    addPayment(payment);
    Alert.alert('Success', 'Payment saved locally!', [
      { text: 'OK', onPress: () => navigation.navigate('CustomerHub') }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Entry</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={!canSave}
          style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
        >
          <CheckSquare size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>{isAdvance ? 'Advance Payment' : `Payment against ${selectedInvoice?.invoice_number}`}</Text>
          <Text style={styles.infoValue}>{selectedCustomer.customer_name}</Text>
          {!isAdvance && (
            <Text style={{ marginTop: 4, color: '#dc2626', fontWeight: 'bold' }}>
              Balance: ₹{remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Payment Mode</Text>
          <View style={styles.modeRow}>
            {MODES.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => { setMode(m); setReference(''); setBankName(''); setChequeDate(''); setAmount(isAdvance ? '' : String(remainingBalance.toFixed(2))); }}
              >
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Amount {(!isAdvance) && `(max ₹${remainingBalance.toFixed(2)})`}</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder={isAdvance ? "0.00" : String(remainingBalance.toFixed(2))}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {isCheque && (
          <>
            <View style={styles.section}>
              <View style={styles.flexBetween}>
                <Text style={styles.label}>Bank Name</Text>
                <TouchableOpacity onPress={() => refetchBanks()}><RefreshCw size={16} color="#6b7280" /></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowBankModal(true)}>
                <Text style={[styles.dropdownBtnText, !bankName && { color: '#9ca3af' }]}>{bankName || '— Select Bank —'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Cheque No.</Text>
              <TextInput
                style={styles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="Enter cheque number"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Cheque Date</Text>
              <TextInput
                style={styles.input}
                value={chequeDate}
                onChangeText={setChequeDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </>
        )}

        {isOnline && (
          <View style={styles.section}>
            <View style={styles.flexBetween}>
              <Text style={styles.label}>Reference / UTR No.</Text>
              <TouchableOpacity onPress={() => refetchCredits()}><RefreshCw size={16} color="#6b7280" /></TouchableOpacity>
            </View>
            {credits.length > 0 ? (
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowCreditModal(true)}>
                <Text style={[styles.dropdownBtnText, !reference && { color: '#9ca3af' }]}>{reference || '— Select Reference —'}</Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="Enter UTR / reference number"
                placeholderTextColor="#9ca3af"
              />
            )}
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              {credits.length === 0 ? 'No pending bank credits found — enter manually' : `${credits.length} unconsumed credit(s) available`}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.mainSaveBtn, !canSave && { opacity: 0.5 }]} 
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.mainSaveText}>Save {isAdvance ? 'Advance ' : ''}Payment</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>Saved locally • Syncs during EOD</Text>

      </ScrollView>

      {/* Modals */}
      <Modal visible={showBankModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}><X size={24} color="#111827" /></TouchableOpacity>
            </View>
            <FlatList
              data={banks}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setBankName(item.bank_name); setShowBankModal(false); }}>
                  <Text style={styles.modalItemText}>{item.bank_name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showCreditModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Reference</Text>
              <TouchableOpacity onPress={() => setShowCreditModal(false)}><X size={24} color="#111827" /></TouchableOpacity>
            </View>
            <FlatList
              data={credits}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setReference(`[${item.id}] ${item.bank_ref_id}`); setShowCreditModal(false); }}>
                  <Text style={styles.modalItemText}>[{item.id}] {item.bank_ref_id}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Cr: ₹{Number(item.credit_amount).toFixed(2)} | Bal: ₹{(item.credit_amount - item.consumed_amount).toFixed(2)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { marginRight: 12, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2f7f74', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  content: { padding: 16 },
  infoBox: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 20 },
  infoLabel: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#1e3a8a', fontWeight: '500' },
  section: { marginBottom: 20 },
  flexBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f3f4f6', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#2f7f74', borderColor: '#2f7f74' },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  modeBtnTextActive: { color: '#fff' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12 },
  currencyPrefix: { fontSize: 18, color: '#6b7280', fontWeight: '500', marginRight: 8 },
  amountInput: { flex: 1, height: 52, fontSize: 20, fontWeight: 'bold', color: '#111827' },
  input: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, color: '#111827' },
  dropdownBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 16, height: 48, justifyContent: 'center' },
  dropdownBtnText: { fontSize: 15, color: '#111827' },
  mainSaveBtn: { backgroundColor: '#2f7f74', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, marginBottom: 12 },
  mainSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#6b7280' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemText: { fontSize: 16, color: '#111827', fontWeight: '500', marginBottom: 4 }
});
