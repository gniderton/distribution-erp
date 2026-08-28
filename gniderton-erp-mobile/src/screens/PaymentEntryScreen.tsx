import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckSquare } from 'lucide-react-native';
import { useAppStore } from '../store';

const MODES = ['CASH', 'CHEQUE', 'UPI', 'NEFT'];

function genPaymentId() {
  return 'PAY-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
}

export default function PaymentEntryScreen({ navigation }: any) {
  const { currentUser, selectedCustomer, addPayment, selectedInvoice } = useAppStore();
  const [mode, setMode] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  if (!selectedCustomer) {
    setTimeout(() => navigation.goBack(), 0);
    return null;
  }

  const isAdvance = !selectedInvoice;
  const isCheque = mode === 'CHEQUE';
  const isOnline = mode === 'UPI' || mode === 'NEFT';

  const numAmt = parseFloat(amount);
  const canSave = !isNaN(numAmt) && numAmt > 0 &&
    (isCheque ? !!(reference.trim() && bankName.trim() && chequeDate.trim()) : true) &&
    (isOnline ? !!reference.trim() : true);

  const handleSave = () => {
    if (!canSave) return;
    
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
        
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>{isAdvance ? 'Advance Payment' : `Payment against ${selectedInvoice?.invoice_number}`}</Text>
          <Text style={styles.infoValue}>{selectedCustomer.customer_name}</Text>
          {!isAdvance && (
            <Text style={{ marginTop: 4, color: '#dc2626', fontWeight: 'bold' }}>
              Balance: ₹{selectedInvoice?.balance_amount?.toLocaleString('en-IN')}
            </Text>
          )}
        </View>

        {/* Mode */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Mode</Text>
          <View style={styles.modeRow}>
            {MODES.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => { setMode(m); setReference(''); setBankName(''); setChequeDate(''); }}
              >
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Cheque Fields */}
        {isCheque && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. HDFC Bank"
                placeholderTextColor="#9ca3af"
              />
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

        {/* Online Fields */}
        {isOnline && (
          <View style={styles.section}>
            <Text style={styles.label}>Reference / UTR No.</Text>
            <TextInput
              style={styles.input}
              value={reference}
              onChangeText={setReference}
              placeholder="Enter UTR / reference number"
              placeholderTextColor="#9ca3af"
            />
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
  label: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f3f4f6', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#2f7f74', borderColor: '#2f7f74' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeBtnTextActive: { color: '#fff' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12 },
  currencyPrefix: { fontSize: 18, color: '#6b7280', fontWeight: '500', marginRight: 8 },
  amountInput: { flex: 1, height: 52, fontSize: 20, fontWeight: 'bold', color: '#111827' },
  input: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, color: '#111827' },
  mainSaveBtn: { backgroundColor: '#2f7f74', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, marginBottom: 12 },
  mainSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#6b7280' }
});
