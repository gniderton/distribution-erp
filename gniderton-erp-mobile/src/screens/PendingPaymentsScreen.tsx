import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../store';

export default function PendingPaymentsScreen({ navigation }: any) {
  const { pendingPayments, removePayment } = useAppStore();
  const paymentTotal = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unsynced Payments</Text>
      </View>

      <FlatList
        data={pendingPayments}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View>
              <Text style={styles.summaryLabel}>Payments</Text>
              <Text style={styles.summaryValue}>{pendingPayments.length}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>Total Collected</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>₹{paymentTotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <Text style={styles.itemCardTitle}>{item.customer_name}</Text>
              <TouchableOpacity onPress={() => removePayment(item.uid)} style={styles.deleteBtn}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <View style={styles.itemCardFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemCardSub}>{item.mode} • {item.invoice_no}</Text>
                {item.mode === 'CHEQUE' && (
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {item.bank_name} • No: {item.reference || item.cheque_no} • {item.cheque_date}
                  </Text>
                )}
                {(item.mode === 'UPI' || item.mode === 'NEFT') && (
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Ref: {item.reference}
                  </Text>
                )}
              </View>
              <Text style={styles.itemCardVal}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}><Text style={styles.emptyText}>No payments recorded yet</Text></View>
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
  deleteBtn: { padding: 4, borderRadius: 4, backgroundColor: '#fef2f2' },
  itemCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  itemCardSub: { fontSize: 13, color: '#6b7280' },
  itemCardVal: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' }
});
