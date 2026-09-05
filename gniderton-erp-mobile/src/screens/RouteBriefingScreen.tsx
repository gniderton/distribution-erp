import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Info, DollarSign, ShoppingCart, Activity, AlertTriangle, CheckCircle, ChevronDown, CheckSquare, Square } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';
import { useAppStore } from '../store';

const { width } = Dimensions.get('window');

export default function RouteBriefingScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { currentUser } = useAppStore();

  const [briefingData, setBriefingData] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch actual aggregated briefing data from backend
  const { data: rawCustomers, isLoading } = useQuery({
    queryKey: ['route_briefing_customers', currentUser?.id, 'next_working_day'],
    queryFn: async () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
      
      // If the next day is Sunday (0), skip to Monday
      if (targetDate.getDay() === 0) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = days[targetDate.getDay()];
      
      const res = await axios.get(`${API_URL}/dse/route-briefing`, { params: { dse_id: currentUser?.id, day } });
      return res.data;
    },
    enabled: !!currentUser?.id
  });

  useEffect(() => {
    if (rawCustomers) {
      setBriefingData(rawCustomers);
    }
  }, [rawCustomers]);

  const handleUpdateItem = (id: string, field: string, value: any) => {
    setBriefingData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSave = () => {
    // Check if any inactive customers are missing a strategy
    const missing = briefingData.find(c => c.mockContext.isInactive && !c.strategy.trim());
    if (missing) {
      Alert.alert('Strategy Required', `Please enter a visit strategy for inactive customer: ${missing.customer_name}`);
      return;
    }

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Briefing Complete!', 'Your route plan has been saved successfully.');
      navigation.goBack();
    }, 1000);
  };

  const renderCard = ({ item }: { item: any }) => {
    const { mockContext, objective, strategy, expanded } = item;
    
    const today = new Date();
    const badgeText = today.getDay() === 6 ? "Monday's Route" : "Tomorrow's Route";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
            <Text style={styles.routeBadge}>{badgeText}</Text>
          </View>
          {mockContext.balance > 0 && (
            <View style={styles.dueBadge}>
              <Text style={styles.dueText}>Due: ₹{mockContext.balance.toLocaleString('en-IN')}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.contextBox} 
          activeOpacity={0.7} 
          onPress={() => handleUpdateItem(item.id, 'expanded', !expanded)}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.contextTitle}>Historical Context (Last 14 Days)</Text>
            <ChevronDown size={16} color={theme.textSecondary} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <ShoppingCart size={14} color={theme.textSecondary} style={{ marginRight: 4 }}/>
              <Text style={styles.statValue}>₹{mockContext.recentOrders.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.stat}>
              <DollarSign size={14} color={theme.success} style={{ marginRight: 4 }}/>
              <Text style={[styles.statValue, { color: theme.success }]}>₹{mockContext.recentPayments.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.stat}>
              <Activity size={14} color={theme.error} style={{ marginRight: 4 }}/>
              <Text style={styles.statValue}>CR: ₹{mockContext.creditNotes.toLocaleString('en-IN')}</Text>
            </View>
          </View>
          <Text style={styles.lastVisitText}>Last Visit: {mockContext.lastVisit}</Text>

          {/* Expandable Recent Items */}
          {expanded && !mockContext.isInactive && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>Recent Invoice Items</Text>
              <Text style={{ fontSize: 13, color: theme.text, marginBottom: 4 }}>• 5x Premium Detergent (1kg)</Text>
              <Text style={{ fontSize: 13, color: theme.text, marginBottom: 4 }}>• 12x Bath Soap Bar (100g)</Text>
              <Text style={{ fontSize: 13, color: theme.text }}>• 2x Floor Cleaner (5L)</Text>
            </View>
          )}
          {expanded && mockContext.isInactive && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Text style={{ fontSize: 13, color: theme.textMuted, fontStyle: 'italic' }}>No invoice items in the last 14 days.</Text>
            </View>
          )}
        </TouchableOpacity>

        {mockContext.isInactive && (
          <View style={styles.inactiveWarning}>
            <AlertTriangle size={16} color="#c2410c" style={{ marginRight: 6 }}/>
            <Text style={styles.inactiveText}>Inactive Account - Needs Attention</Text>
          </View>
        )}

        <View style={styles.actionArea}>
          <Text style={styles.actionLabel}>Primary Objective</Text>
          <View style={styles.objectiveRow}>
            {['Order', 'Payment', 'Both'].map(obj => (
              <TouchableOpacity 
                key={obj}
                style={[styles.objBtn, objective === obj && styles.objBtnActive]}
                onPress={() => handleUpdateItem(item.id, 'objective', obj)}
              >
                <Text style={[styles.objBtnText, objective === obj && styles.objBtnTextActive]}>{obj}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mockContext.isInactive && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.actionLabel}>Visit Strategy <Text style={{ color: theme.error }}>*</Text></Text>
              <TextInput 
                style={styles.strategyInput}
                placeholder="How will you re-engage?"
                placeholderTextColor={theme.textMuted}
                value={strategy}
                onChangeText={(t) => handleUpdateItem(item.id, 'strategy', t)}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Briefing</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 12, color: theme.textSecondary }}>Aggregating route data...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList 
            data={briefingData}
            keyExtractor={item => String(item.id)}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.center, { marginTop: 50 }]}>
                <AlertTriangle size={32} color={theme.textMuted} />
                <Text style={{ marginTop: 12, color: theme.textSecondary, fontSize: 16 }}>No customers found to plan.</Text>
              </View>
            }
          />
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Complete Briefing'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: theme.text },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: theme.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  customerName: { fontSize: 17, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  routeBadge: { fontSize: 12, color: theme.primary, fontWeight: '500' },
  dueBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dueText: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
  contextBox: { backgroundColor: theme.input, borderRadius: 12, padding: 12, marginBottom: 12 },
  contextTitle: { fontSize: 12, color: theme.textSecondary, fontWeight: '600', marginBottom: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '600', color: theme.text },
  lastVisitText: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' },
  inactiveWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffedd5', padding: 10, borderRadius: 8, marginBottom: 12 },
  inactiveText: { color: '#c2410c', fontSize: 13, fontWeight: '600' },
  actionArea: { marginTop: 4 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
  objectiveRow: { flexDirection: 'row', gap: 8 },
  objBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: 'center', backgroundColor: theme.card },
  objBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  objBtnText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  objBtnTextActive: { color: '#fff' },
  strategyInput: { backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, fontSize: 14, color: theme.text, minHeight: 44 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border },
  saveBtn: { backgroundColor: theme.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
