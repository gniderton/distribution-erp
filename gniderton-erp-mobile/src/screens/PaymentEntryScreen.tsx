import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckSquare, RefreshCw, X } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';
import { useTheme } from '../theme';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/geo';

const MODES = ['CASH', 'CHEQUE', 'UPI', 'NEFT'];

function genPaymentId() {
  return 'PAY-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
}

export default function PaymentEntryScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { currentUser, selectedCustomer, pendingPayments, addPayment, selectedInvoice, sessionVerifiedCustomers, markCustomerSessionVerified } = useAppStore();
  const [mode, setMode] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  const [showBankModal, setShowBankModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [remoteReason, setRemoteReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [currentLat, setCurrentLat] = useState(0);
  const [currentLng, setCurrentLng] = useState(0);

  const REASON_OPTIONS = ['Paid online remotely', 'Collected at office/elsewhere', 'Customer not at shop', 'Other'];

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

  const remainingBalance = selectedInvoice ? (Number(selectedInvoice.balance_amount) - alreadyPaidOffline) : Infinity;

  const numAmt = parseFloat(amount);
  const canSave = !isNaN(numAmt) && numAmt > 0 &&
    (isAdvance || numAmt <= remainingBalance + 0.01) &&
    (isCheque ? !!((reference || '').trim() && (bankName || '').trim() && (chequeDate || '').trim()) : true) &&
    (isOnline ? !!(reference || '').trim() : true);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const commitPayment = (notesStr: string = '', nextScreen?: string) => {
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
      reference: (reference || '').trim(),
      bank_name: (bankName || '').trim(),
      cheque_date: (chequeDate || '').trim(),
      is_advance: isAdvance,
      latitude: currentLat,
      longitude: currentLng,
      notes: notesStr,
    };

    addPayment(payment);
    setSaving(false);
    
    setSuccess(true);
    setTimeout(() => {
      navigation.navigate(nextScreen || 'CustomerHub');
    }, 2000);
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    
    if (!isAdvance && numAmt > remainingBalance + 0.01) {
      Alert.alert('Error', `Amount exceeds remaining balance: ₹${remainingBalance.toFixed(2)}`);
      setSaving(false);
      return;
    }

    let lat = 0;
    let lng = 0;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lng = location.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
      }
    } catch (err) {
      console.log('Location fetch failed:', err);
    }

    const cLat = selectedCustomer.latitude || selectedCustomer.location_lat;
    const cLng = selectedCustomer.longitude || selectedCustomer.location_lng;
    const isPending = (!cLat || !cLng) && !sessionVerifiedCustomers.includes(selectedCustomer.id);

    if (isPending) {
      Alert.alert(
        'Missing GPS Location',
        'Are you currently at the customer shop?',
        [
          { 
            text: 'Yes', 
            onPress: () => { 
              markCustomerSessionVerified(selectedCustomer.id);
              commitPayment('[At Shop - Pending Verification]', 'CustomerEdit'); 
            } 
          },
          { text: 'No (Remote Payment)', onPress: () => { commitPayment('[Remote Payment]'); } }
        ]
      );
      return;
    }

    const distance = calculateDistance(lat, lng, Number(cLat), Number(cLng));
    
    if (distance > 200) {
      setRemoteReason('');
      setOtherReason('');
      setShowReasonModal(true);
      return;
    }

    commitPayment('');
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconBox}>
          <CheckSquare size={32} color={theme.success || '#10b981'} />
        </View>
        <Text style={styles.successTitle}>Payment Saved!</Text>
        <Text style={styles.successSub}>Your payment has been saved locally and will sync during EOD.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
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
            <Text style={{ marginTop: 4, color: theme.error, fontWeight: 'bold' }}>
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
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>

        {isCheque && (
          <>
            <View style={styles.section}>
              <View style={styles.flexBetween}>
                <Text style={styles.label}>Bank Name</Text>
                <TouchableOpacity onPress={() => refetchBanks()}><RefreshCw size={16} color={theme.textSecondary} /></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowBankModal(true)}>
                <Text style={[styles.dropdownBtnText, !bankName && { color: theme.textMuted }]}>{bankName || '— Select Bank —'}</Text>
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
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Cheque Date</Text>
                <TouchableOpacity
                  style={[styles.input, { justifyContent: 'center' }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: chequeDate ? theme.text : theme.textMuted, fontSize: 14 }}>
                    {chequeDate || 'YYYY-MM-DD'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={chequeDate ? new Date(chequeDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setChequeDate(selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
            </View>
          </>
        )}

        {isOnline && (
          <View style={styles.section}>
            <View style={styles.flexBetween}>
              <Text style={styles.label}>Reference / UTR No.</Text>
              <TouchableOpacity onPress={() => refetchCredits()}><RefreshCw size={16} color={theme.textSecondary} /></TouchableOpacity>
            </View>
            {credits.length > 0 ? (
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowCreditModal(true)}>
                <Text style={[styles.dropdownBtnText, !reference && { color: theme.textMuted }]}>{reference || '— Select Reference —'}</Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="Enter UTR / reference number"
                placeholderTextColor={theme.textMuted}
              />
            )}
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
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
      <Modal visible={showReasonModal} transparent animationType="fade">
        <View style={styles.modalBgReason}>
          <View style={styles.modalContentReason}>
            <Text style={styles.modalTitle}>Remote Payment Justification</Text>
            <Text style={styles.modalSub}>You are >200m away from the verified shop location. Please provide a reason.</Text>
            
            <View style={{ marginBottom: 16 }}>
              {REASON_OPTIONS.map(opt => (
                <TouchableOpacity 
                  key={opt}
                  style={[styles.reasonOption, remoteReason === opt && styles.reasonOptionSelected]}
                  onPress={() => setRemoteReason(opt)}
                >
                  <Text style={[styles.reasonOptionText, remoteReason === opt && styles.reasonOptionTextSelected]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {remoteReason === 'Other' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Enter custom reason..."
                placeholderTextColor="#94a3b8"
                value={otherReason}
                onChangeText={setOtherReason}
              />
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setShowReasonModal(false); setSaving(false); }}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalBtnSubmit} 
                onPress={() => {
                  const finalReason = remoteReason === 'Other' ? otherReason : remoteReason;
                  if(!finalReason.trim()) return Alert.alert('Error', 'Reason is required');
                  setShowReasonModal(false);
                  commitPayment(`[Remote: ${finalReason.trim()}]`);
                }}
              >
                <Text style={styles.modalBtnSubmitText}>Submit Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBankModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}><X size={24} color={theme.text} /></TouchableOpacity>
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
              <TouchableOpacity onPress={() => setShowCreditModal(false)}><X size={24} color={theme.text} /></TouchableOpacity>
            </View>
            <FlatList
              data={credits}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setReference(`[${item.id}] ${item.bank_ref_id}`); setShowCreditModal(false); }}>
                  <Text style={styles.modalItemText}>[{item.id}] {item.bank_ref_id}</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>Cr: ₹{Number(item.credit_amount).toFixed(2)} | Bal: ₹{(item.credit_amount - item.consumed_amount).toFixed(2)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { marginRight: 12, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: theme.text },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  content: { padding: 16 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, padding: 32 },
  successIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.isDark ? '#14532d' : '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
  successSub: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 },
  infoBox: { backgroundColor: theme.isDark ? '#1e293b' : '#eff6ff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.isDark ? '#3b82f6' : '#bfdbfe', marginBottom: 20 },
  infoLabel: { fontSize: 12, color: theme.primary, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, color: theme.isDark ? '#93c5fd' : '#1e3a8a', fontWeight: '500' },
  section: { marginBottom: 20 },
  flexBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', color: theme.textSecondary, marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.input, alignItems: 'center' },
  modeBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  modeBtnTextActive: { color: '#fff' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.input, borderRadius: 12, paddingHorizontal: 12 },
  currencyPrefix: { fontSize: 18, color: theme.textSecondary, fontWeight: '500', marginRight: 8 },
  amountInput: { flex: 1, height: 52, fontSize: 20, fontWeight: 'bold', color: theme.text },
  input: { backgroundColor: theme.input, borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, color: theme.text },
  dropdownBtn: { backgroundColor: theme.input, borderRadius: 12, paddingHorizontal: 16, height: 48, justifyContent: 'center' },
  dropdownBtnText: { fontSize: 15, color: theme.text },
  mainSaveBtn: { backgroundColor: theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, marginBottom: 12 },
  mainSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', fontSize: 12, color: theme.textSecondary },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalItemText: { fontSize: 16, color: theme.text, fontWeight: '500', marginBottom: 4 },
  
  modalBgReason: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContentReason: { backgroundColor: theme.card, padding: 24, borderRadius: 16 },
  modalSub: { fontSize: 14, color: theme.textSecondary, marginBottom: 16 },
  modalInput: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, color: theme.text, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: theme.input, alignItems: 'center' },
  modalBtnCancelText: { color: theme.text, fontWeight: '600' },
  modalBtnSubmit: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: theme.primary, alignItems: 'center' },
  modalBtnSubmitText: { color: '#fff', fontWeight: '600' },
  reasonOption: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  reasonOptionSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  reasonOptionText: { fontSize: 14, color: theme.text },
  reasonOptionTextSelected: { color: '#fff', fontWeight: 'bold' }
});
