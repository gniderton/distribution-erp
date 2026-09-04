import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle } from 'lucide-react-native';
import { useAppStore, PendingOrder } from '../store';
import { useTheme } from '../theme';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/geo';

function genOfflineId(code: string) {
  const ts = new Date();
  const mmdd = String(ts.getMonth() + 1).padStart(2, '0') + String(ts.getDate()).padStart(2, '0');
  const hhmmss = String(ts.getHours()).padStart(2, '0') + String(ts.getMinutes()).padStart(2, '0') + String(ts.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SO-${code}-${mmdd}-${hhmmss}-${rand}`;
}

export default function CartSummaryScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { currentUser, selectedCustomer, cart, products, addOrder, setCart, sessionVerifiedCustomers, markCustomerSessionVerified } = useAppStore();

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const hasSaved = React.useRef(false);

  const [showReasonModal, setShowReasonModal] = useState(false);
  const [remoteReason, setRemoteReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [currentLat, setCurrentLat] = useState(0);
  const [currentLng, setCurrentLng] = useState(0);

  const REASON_OPTIONS = ['Phone Order', 'Customer not at shop', 'Shop Closed', 'Other'];

  const applyPricing = (prods: any[], customer: any) => {
    if (!Array.isArray(prods)) return [];
    if (!customer) return prods.map(p => ({ ...p, current_price: p?.dealer_rate || p?.mrp }));
    const col = customer.default_price_col ?? 'dealer_rate';
    let exceptions = customer.pricing_ex ?? [];
    if (typeof exceptions === 'string') {
      try { exceptions = JSON.parse(exceptions); } catch { exceptions = []; }
    }
    if (!Array.isArray(exceptions)) exceptions = [];

    return prods.map(p => {
      let rateCol = col;
      const ex = exceptions.find((e: any) => e.brand_id === p?.brand_id);
      if (ex) rateCol = ex.price_column;
      const price = Number(p?.[rateCol]) > 0 ? Number(p?.[rateCol]) : (Number(p?.dealer_rate) || Number(p?.mrp));
      return { ...p, current_price: price };
    });
  };

  const cartItems = useMemo(() => {
    const pricedProducts = applyPricing(products, selectedCustomer);
    
    return Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = pricedProducts.find((p: any) => String(p.id) === id);
        const baseRate = Number(product?.current_price || product?.dealer_rate || 0);
        const taxPct = Number(product?.tax_percentage || 0);
        return {
          id,
          product_name: product?.product_name || `Product #${id}`,
          qty,
          rate: baseRate,
          tax_pct: taxPct,
        };
      });
  }, [cart, products, selectedCustomer]);

  const total = useMemo(() => cartItems.reduce((s, i) => s + i.qty * i.rate, 0), [cartItems]);

  const commitOrder = (notesStr: string = '', nextScreen?: string) => {
    if (!currentUser || !selectedCustomer || cartItems.length === 0) return;

    const items = cartItems.map(i => ({
      product_id: i.id,
      qty: i.qty,
      rate: i.rate,
      tax_pct: i.tax_pct,
      product_name: i.product_name,
    }));

    const order: PendingOrder = {
      tempId: Date.now(),
      offline_no: genOfflineId(currentUser.employee_code || 'UNK'),
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.customer_name,
      dse_id: currentUser.id,
      order_date: new Date().toISOString().split('T')[0],
      items,
      latitude: currentLat,
      longitude: currentLng,
      notes: notesStr,
    };

    hasSaved.current = true;
    addOrder(order);
    setCart({});
    setSaving(false);
    
    setSuccess(true);
    setTimeout(() => {
      navigation.navigate(nextScreen || 'Home');
    }, 2000);
  };

  const handleSaveAttempt = async () => {
    if (!currentUser || !selectedCustomer || cartItems.length === 0 || saving) return;
    setSaving(true);

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
              commitOrder('[At Shop - Pending Verification]', 'CustomerEdit'); 
            } 
          },
          { text: 'No (Phone Order)', onPress: () => { commitOrder('[Remote Order: Phone Order]'); } }
        ]
      );
      return;
    }

    const distance = (cLat && cLng) ? calculateDistance(lat, lng, Number(cLat), Number(cLng)) : 0;
    
    if (distance > 200) {
      setRemoteReason('');
      setOtherReason('');
      setShowReasonModal(true);
      return;
    }

    commitOrder('');
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconBox}>
          <CheckCircle size={32} color={theme.success || '#10b981'} />
        </View>
        <Text style={styles.successTitle}>Order Saved!</Text>
        <Text style={styles.successSub}>Your order has been saved locally and will sync during EOD.</Text>
      </View>
    );
  }

  if (cartItems.length === 0) {
    if (!hasSaved.current) {
      setTimeout(() => navigation.goBack(), 0);
    }
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart Preview</Text>
        <TouchableOpacity onPress={handleSaveAttempt} style={styles.saveBtn} disabled={saving}>
          <CheckCircle size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Items List */}
        <View style={styles.itemsList}>
          {cartItems.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
                <Text style={styles.itemSub}>{item.qty} × ₹{item.rate.toFixed(2)}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{(item.qty * item.rate).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Items</Text>
            <Text style={styles.totalLabel}>{cartItems.length}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 8 }]}>
            <Text style={styles.totalLabelBig}>Total</Text>
            <Text style={styles.totalValueBig}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Customer Context */}
        <View style={styles.customerBox}>
          <Text style={styles.customerLabel}>Customer</Text>
          <Text style={styles.customerValue}>{selectedCustomer?.customer_name}</Text>
        </View>

        <TouchableOpacity style={styles.mainSaveBtn} onPress={handleSaveAttempt} disabled={saving}>
          <Text style={styles.mainSaveText}>{saving ? 'Processing...' : 'Save Order Offline'}</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>Order saved locally • Will sync during EOD</Text>

      </ScrollView>

      {/* Remote Reason Modal */}
      <Modal visible={showReasonModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remote Order Justification</Text>
            <Text style={styles.modalSub}>You are &gt;200m away from the verified shop location. Please provide a reason.</Text>
            
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
                  commitOrder(`[Remote: ${finalReason.trim()}]`);
                }}
              >
                <Text style={styles.modalBtnSubmitText}>Submit Order</Text>
              </TouchableOpacity>
            </View>
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
  successSub: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
  itemsList: { gap: 8, marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  itemInfo: { flex: 1, marginRight: 16 },
  itemName: { fontSize: 14, fontWeight: '500', color: theme.text, marginBottom: 4 },
  itemSub: { fontSize: 12, color: theme.textSecondary },
  itemTotal: { fontSize: 15, fontWeight: 'bold', color: theme.text },
  totalsBox: { backgroundColor: theme.input, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: theme.primary, fontWeight: '500' },
  totalLabelBig: { fontSize: 18, color: theme.text, fontWeight: 'bold' },
  totalValueBig: { fontSize: 18, color: theme.text, fontWeight: 'bold' },
  customerBox: { backgroundColor: theme.input, padding: 12, borderRadius: 12, marginBottom: 24 },
  customerLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  customerValue: { fontSize: 14, fontWeight: '500', color: theme.text },
  mainSaveBtn: { backgroundColor: theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  mainSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', fontSize: 12, color: theme.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: theme.card, padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
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
