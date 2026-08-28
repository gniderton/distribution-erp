import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, CreditCard, UserCircle, ArrowRight, BarChart2, ChevronLeft } from 'lucide-react-native';
import { useAppStore } from '../store';

function ActionCard({ icon, title, subtitle, onPress }: { icon: React.ReactNode, title: string, subtitle: string, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconBox}>
        {icon}
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <ArrowRight size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function CustomerHubScreen({ navigation }: any) {
  const { selectedCustomer, pendingOrders, pendingPayments } = useAppStore();

  // If we arrived here without a selected customer, go back
  if (!selectedCustomer) {
    // For testing if navigating directly, we can just render a fallback
    // setTimeout(() => navigation.replace('DseDashboard'), 0);
    // return null;
  }

  const customerName = selectedCustomer?.customer_name || 'Walk-in Customer';
  const customerCode = selectedCustomer?.customer_code || '';

  const todayOrders = pendingOrders.filter(o => o.customer_id === selectedCustomer?.id);
  const todayPayments = pendingPayments.filter(p => p.customer_id === selectedCustomer?.id);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{customerName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Info Pills */}
        <View style={styles.pillsRow}>
          {!!customerCode && (
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Code</Text>
              <Text style={styles.pillValue}>{customerCode}</Text>
            </View>
          )}
          {todayOrders.length > 0 && (
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Today's Orders</Text>
              <Text style={[styles.pillValue, { color: '#2f7f74' }]}>{todayOrders.length}</Text>
            </View>
          )}
          {todayPayments.length > 0 && (
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Payments</Text>
              <Text style={[styles.pillValue, { color: '#16a34a' }]}>{todayPayments.length}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsList}>
          <ActionCard 
            icon={<ShoppingBag size={24} color="#2f7f74" />}
            title="New Order"
            subtitle="Place an order for this customer"
            onPress={() => navigation.navigate('OrderForm')}
          />
          <ActionCard 
            icon={<CreditCard size={24} color="#16a34a" />}
            title="Collect Payment"
            subtitle="Record a payment against invoices"
            onPress={() => navigation.navigate('PaymentList')}
          />
          <ActionCard 
            icon={<UserCircle size={24} color="#a855f7" />}
            title="Customer Profile"
            subtitle="View details and edit requests"
            onPress={() => navigation.navigate('CustomerProfile')}
          />
          <ActionCard 
            icon={<BarChart2 size={24} color="#3b82f6" />}
            title="Customer Dashboard"
            subtitle="Sales KPIs, credit summary, activity"
            onPress={() => navigation.navigate('CustomerDashboard')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', flex: 1 },
  content: { padding: 16 },
  pillsRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 4, marginBottom: 24 },
  pill: { alignItems: 'center' },
  pillLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  pillValue: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  actionsList: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  cardSub: { fontSize: 13, color: '#6b7280' }
});
