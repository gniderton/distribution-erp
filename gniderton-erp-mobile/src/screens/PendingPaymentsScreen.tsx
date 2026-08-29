import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useTheme } from '../theme';

export default function PendingPaymentsScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { pendingPayments, removePayment } = useAppStore();
  const paymentTotal = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unsynced Payments</Text>
      </View>

      <FlatList
        data={pendingPayments}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.summaryCard, { backgroundColor: theme.isDark ? '#143823' : '#f0fdf4', borderColor: theme.isDark ? '#235937' : '#bbf7d0' }]}>
            <View>
              <Text style={styles.summaryLabel}>Payments</Text>
              <Text style={styles.summaryValue}>{pendingPayments.length}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>Total Collected</Text>
              <Text style={[styles.summaryValue, { color: theme.success }]}>₹{paymentTotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <Text style={styles.itemCardTitle}>{item.customer_name}</Text>
              <TouchableOpacity onPress={() => removePayment(item.uid)} style={styles.deleteBtn}>
                <Trash2 size={16} color={theme.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.itemCardFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemCardSub}>{item.mode} • {item.invoice_no}</Text>
                {item.mode === 'CHEQUE' && (
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    {item.bank_name} • No: {item.reference || item.cheque_no} • {item.cheque_date}
                  </Text>
                )}
                {(item.mode === 'UPI' || item.mode === 'NEFT') && (
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
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
  deleteBtn: { padding: 4, borderRadius: 4, backgroundColor: theme.isDark ? '#3d1a1a' : '#fef2f2' },
  itemCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  itemCardSub: { fontSize: 13, color: theme.textSecondary },
  itemCardVal: { fontSize: 14, fontWeight: 'bold', color: theme.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: theme.textSecondary, fontSize: 14, textAlign: 'center' }
});
