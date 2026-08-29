import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, CreditCard, UserCircle, ArrowRight, BarChart2, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useAppStore } from '../store';

function ActionCard({ icon, title, subtitle, onPress, styles, theme }: { icon: React.ReactNode, title: string, subtitle: string, onPress: () => void, styles: any, theme: any }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconBox}>
        {icon}
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <ArrowRight size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

export default function CustomerHubScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
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
          <ChevronLeft size={24} color={theme.text} />
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
              <Text style={[styles.pillValue, { color: theme.primary }]}>{todayOrders.length}</Text>
            </View>
          )}
          {todayPayments.length > 0 && (
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Payments</Text>
              <Text style={[styles.pillValue, { color: theme.success }]}>{todayPayments.length}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsList}>
          <ActionCard 
            icon={<ShoppingBag size={24} color={theme.primary} />}
            title="New Order"
            subtitle="Place an order for this customer"
            onPress={() => navigation.navigate('OrderForm')}
            styles={styles}
            theme={theme}
          />
          <ActionCard 
            icon={<CreditCard size={24} color={theme.success} />}
            title="Collect Payment"
            subtitle="Record a payment against invoices"
            onPress={() => navigation.navigate('PaymentList')}
            styles={styles}
            theme={theme}
          />
          <ActionCard 
            icon={<UserCircle size={24} color="#a855f7" />}
            title="Customer Profile"
            subtitle="View details and edit requests"
            onPress={() => navigation.navigate('CustomerProfile')}
            styles={styles}
            theme={theme}
          />
          <ActionCard 
            icon={<BarChart2 size={24} color="#3b82f6" />}
            title="Customer Dashboard"
            subtitle="Sales KPIs, credit summary, activity"
            onPress={() => navigation.navigate('CustomerDashboard')}
            styles={styles}
            theme={theme}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, flex: 1 },
  content: { padding: 16 },
  pillsRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 4, marginBottom: 24 },
  pill: { alignItems: 'center' },
  pillLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  pillValue: { fontSize: 15, fontWeight: 'bold', color: theme.text },
  actionsList: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.input, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 2 },
  cardSub: { fontSize: 13, color: theme.textSecondary }
});
