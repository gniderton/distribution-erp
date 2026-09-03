import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useTheme } from '../theme';
import { useQueryClient } from '@tanstack/react-query';

export default function PendingOrdersScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { pendingOrders, removeOrder, setCart, setSelectedCustomer, currentUser } = useAppStore();
  const orderTotal = pendingOrders.reduce((sum, o) => {
    const itemSum = (o.items || []).reduce((s, i) => s + (i.amount || (i.qty * i.rate) || 0), 0);
    return sum + itemSum;
  }, 0);

  const queryClient = useQueryClient();

  const editOrder = (order: any) => {
    // Try to find the full customer object from cache
    let fullCustomer = { id: order.customer_id, customer_name: order.customer_name };
    const allCustomers: any = queryClient.getQueryData(['customers', currentUser?.id, 'all']) || [];
    const todayCustomers: any = queryClient.getQueryData(['customers', currentUser?.id, 'today']) || [];
    const found = allCustomers.find((c: any) => c.id === order.customer_id) || todayCustomers.find((c: any) => c.id === order.customer_id);
    
    if (found) {
      fullCustomer = found;
    }

    setSelectedCustomer(fullCustomer);
    
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
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unsynced Orders</Text>
      </View>

      <FlatList
        data={pendingOrders}
        keyExtractor={item => String(item.tempId)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.summaryCard, { backgroundColor: theme.isDark ? '#1e293b' : '#eff6ff', borderColor: theme.isDark ? '#334155' : '#bfdbfe' }]}>
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
                  <Pencil size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeOrder(item.tempId)} style={[styles.actionCircle, { backgroundColor: theme.isDark ? '#3d1a1a' : '#fef2f2' }]}>
                  <Trash2 size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Line Items Preview */}
            <View style={{ paddingVertical: 8 }}>
              {(item.items || []).map((lineItem: any, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
                    {lineItem.product_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, marginHorizontal: 8 }}>
                    {lineItem.qty} x ₹{Number(lineItem.rate || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text, width: 60, textAlign: 'right' }}>
                    ₹{(lineItem.qty * Number(lineItem.rate || 0)).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.itemCardFooter, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
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

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { marginRight: 12, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: theme.text },
  listContent: { padding: 16, paddingBottom: 100 },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  summaryLabel: { fontSize: 13, color: theme.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  itemCard: { backgroundColor: theme.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemCardTitle: { fontSize: 14, fontWeight: '600', color: theme.text },
  itemCardSub: { fontSize: 13, color: theme.textSecondary },
  actionCircle: { padding: 8, borderRadius: 20, backgroundColor: theme.input },
  itemCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  itemCardVal: { fontSize: 14, fontWeight: 'bold', color: theme.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: theme.textSecondary, fontSize: 14, textAlign: 'center' }
});
