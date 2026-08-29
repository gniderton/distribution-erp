import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../store';

export default function PendingOrdersScreen({ navigation }: any) {
  const { pendingOrders, removeOrder, setCart, setSelectedCustomer } = useAppStore();
  const orderTotal = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const editOrder = (order: any) => {
    setSelectedCustomer({ id: order.customer_id, customer_name: order.customer_name });
    
    const newCart: Record<string, number> = {};
    (order.items || []).forEach((item: any) => {
      newCart[String(item.product_id || item.id)] = item.qty;
    });
    setCart(newCart);
    
    removeOrder(order.tempId);
    navigation.navigate('OrderForm');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unsynced Orders</Text>
      </View>

      <FlatList
        data={pendingOrders}
        keyExtractor={item => String(item.tempId)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.summaryCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <View>
              <Text style={styles.summaryLabel}>Orders</Text>
              <Text style={styles.summaryValue}>{pendingOrders.length}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue}>₹{orderTotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemCardTitle}>{item.customer_name}</Text>
                <Text style={[styles.itemCardSub, { fontFamily: 'monospace' }]}>{item.offline_no}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => editOrder(item)} style={styles.actionCircle}>
                  <Pencil size={16} color="#4b5563" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeOrder(item.tempId)} style={[styles.actionCircle, { backgroundColor: '#fef2f2' }]}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Line Items Preview */}
            <View style={{ paddingVertical: 8 }}>
              {(item.items || []).map((lineItem: any, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: '#4b5563', flex: 1 }} numberOfLines={1}>
                    {lineItem.product_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginHorizontal: 8 }}>
                    {lineItem.qty} x ₹{Number(lineItem.rate || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', width: 60, textAlign: 'right' }}>
                    ₹{(lineItem.qty * Number(lineItem.rate || 0)).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.itemCardFooter, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 4 }]}>
              <Text style={styles.itemCardSub}>{item.items?.length || 0} items</Text>
              <Text style={styles.itemCardVal}>₹{(item.items || []).reduce((sum: number, i: any) => sum + (i.amount || (i.qty * i.rate) || 0), 0).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}><Text style={styles.emptyText}>No orders saved yet</Text></View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { marginRight: 12, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827' },
  listContent: { padding: 16, paddingBottom: 100 },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  summaryLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  itemCard: { backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemCardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemCardSub: { fontSize: 13, color: '#6b7280' },
  actionCircle: { padding: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  itemCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  itemCardVal: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' }
});
