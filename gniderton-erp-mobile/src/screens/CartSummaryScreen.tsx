import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle } from 'lucide-react-native';
import { useAppStore, PendingOrder } from '../store';

function genOfflineId(code: string) {
  const ts = new Date();
  const mmdd = String(ts.getMonth() + 1).padStart(2, '0') + String(ts.getDate()).padStart(2, '0');
  const hhmmss = String(ts.getHours()).padStart(2, '0') + String(ts.getMinutes()).padStart(2, '0') + String(ts.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SO-${code}-${mmdd}-${hhmmss}-${rand}`;
}

export default function CartSummaryScreen({ navigation }: any) {
  const { currentUser, selectedCustomer, cart, products, addOrder } = useAppStore();

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products.find(p => String(p.id) === id);
        return {
          id,
          product_name: product?.product_name || `Product #${id}`,
          qty,
          rate: Number(product?.current_price || product?.dealer_rate || 0),
          tax_pct: 0,
        };
      });
  }, [cart, products]);

  const total = useMemo(() => cartItems.reduce((s, i) => s + i.qty * i.rate, 0), [cartItems]);

  const handleSave = () => {
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
    };

    addOrder(order);
    navigation.navigate('CustomerHub');
  };

  if (cartItems.length === 0) {
    // If empty, go back
    setTimeout(() => navigation.goBack(), 0);
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart Preview</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
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

        <TouchableOpacity style={styles.mainSaveBtn} onPress={handleSave}>
          <Text style={styles.mainSaveText}>Save Order Offline</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>Order saved locally • Will sync during EOD</Text>

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
  itemsList: { gap: 8, marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  itemInfo: { flex: 1, marginRight: 16 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4 },
  itemSub: { fontSize: 12, color: '#6b7280' },
  itemTotal: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  totalsBox: { backgroundColor: '#eef6f5', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#a7d3cd', marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#4d9e92', fontWeight: '500' },
  totalLabelBig: { fontSize: 18, color: '#111827', fontWeight: 'bold' },
  totalValueBig: { fontSize: 18, color: '#111827', fontWeight: 'bold' },
  customerBox: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 12, marginBottom: 24 },
  customerLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  customerValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  mainSaveBtn: { backgroundColor: '#2f7f74', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  mainSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#6b7280' }
});
