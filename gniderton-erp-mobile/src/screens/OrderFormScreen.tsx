import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShoppingCart, Search } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../api/config';

function ProductRow({ product, qty, onChange }: { product: any, qty: number, onChange: (id: string, qty: number) => void }) {
  if (!product) return null;
  const baseRate = Number(product?.current_price || product?.dealer_rate || 0);
  const taxPct = Number(product?.tax_percentage || 0);
  const rateWithTax = baseRate * (1 + taxPct / 100);
  
  const handleTextChange = (val: string) => {
    const n = parseInt(val, 10);
    onChange(String(product.id), isNaN(n) || n < 0 ? 0 : n);
  };

  return (
    <View style={[styles.productRow, qty > 0 && { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
      <View style={styles.prodInfo}>
        <Text style={styles.prodName}>{product?.product_name}</Text>
        <Text style={styles.prodCode}>{product?.ean_code || 'No EAN'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>MRP ₹{Number(product?.mrp || 0).toFixed(2)}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>Rate ₹{rateWithTax.toFixed(2)}</Text>
          {Number(product?.current_stock) > 0 && (
            <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '500' }}>Stk {Number(product.current_stock)}</Text>
          )}
        </View>
      </View>
      <View style={styles.qtyBox}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => onChange(String(product?.id), Math.max(0, qty - 1))}>
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <TextInput 
          style={styles.qtyInput} 
          keyboardType="numeric" 
          value={qty > 0 ? String(qty) : ''} 
          onChangeText={handleTextChange} 
          placeholder="0"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity style={styles.qtyBtn} onPress={() => onChange(String(product.id), qty + 1)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OrderFormScreen({ navigation }: any) {
  const { selectedCustomer, cart, setCartItem, products, setProducts, brands, setBrands } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // Fetch only if not cached
  const { data: rawProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { 
      const res = await axios.get(`${API_URL}/products`); 
      return res.data?.data || res.data; 
    },
    enabled: products.length === 0
  });

  const { data: rawBrands, isLoading: loadingBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => { 
      const res = await axios.get(`${API_URL}/products/brands`); 
      return res.data; 
    },
    enabled: brands.length === 0
  });

  useEffect(() => {
    if (rawProducts?.length > 0) setProducts(rawProducts);
  }, [rawProducts]);

  useEffect(() => {
    if (rawBrands?.length > 0) setBrands(rawBrands);
  }, [rawBrands]);

  // "?"? Pricing engine
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

  const allProducts = useMemo(() => applyPricing(products, selectedCustomer), [products, selectedCustomer]);
  
  const filtered = useMemo(() => {
    let list = allProducts;
    if (selectedBrand) list = list.filter(p => p.brand_id === selectedBrand);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => 
        (p.product_name || '').toLowerCase().includes(q) || 
        (p.product_code || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allProducts, selectedBrand, search]);

  const cartItems = Object.entries(cart || {}).filter(([_, q]) => q > 0);
  const cartCount = cartItems.length;
  const cartTotal = useMemo(() => {
    return (allProducts || []).reduce((sum, p) => {
      const base = Number(p.current_price || p.dealer_rate || 0);
      const tax = Number(p.tax_percentage || 0);
      const qty = (cart || {})[String(p.id)] || 0;
      return sum + (qty * base * (1 + tax / 100));
    }, 0);
  }, [allProducts, cart]);

  const loading = loadingProducts || loadingBrands;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedCustomer?.customer_name || 'Order Form'}
          </Text>
          {cartCount > 0 && (
            <TouchableOpacity style={styles.cartBadge} onPress={() => navigation.navigate('CartSummary')}>
              <ShoppingCart size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.cartBadgeText}>{cartCount} • ₹{cartTotal.toFixed(0)}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {!loading && (brands || []).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <TouchableOpacity 
              style={[styles.brandChip, !selectedBrand && styles.brandChipActive]}
              onPress={() => setSelectedBrand(null)}
            >
              <Text style={[styles.brandChipText, !selectedBrand && styles.brandChipTextActive]}>All</Text>
            </TouchableOpacity>
            {(brands || []).map(b => (
              <TouchableOpacity 
                key={b.id}
                style={[styles.brandChip, selectedBrand === b.id && styles.brandChipActive]}
                onPress={() => setSelectedBrand(selectedBrand === b.id ? null : b.id)}
              >
                <Text style={[styles.brandChipText, selectedBrand === b.id && styles.brandChipTextActive]}>{b.brand_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2f7f74" /></View>
      ) : (
        <FlatList
          data={filtered || []}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          ListHeaderComponent={<Text style={styles.listCount}>{(filtered || []).length} products</Text>}
          renderItem={({ item }) => (
            <ProductRow 
              product={item} 
              qty={cart[String(item.id)] || 0} 
              onChange={setCartItem} 
            />
          )}
        />
      )}

      {cartCount > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate('CartSummary')}>
            <ShoppingCart size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.checkoutText}>Review Cart ({cartCount} items • ₹{cartTotal.toFixed(2)})</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 },
  backBtn: { marginRight: 12, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#111827' },
  cartBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2f7f74', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  cartBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, height: 40, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  brandScroll: { paddingBottom: 4 },
  brandChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  brandChipActive: { backgroundColor: '#2f7f74', borderColor: '#2f7f74' },
  brandChipText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  brandChipTextActive: { color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 80 },
  listCount: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  prodInfo: { flex: 1 },
  prodName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  prodCode: { fontSize: 12, color: '#6b7280' },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 2 },
  qtyBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  qtyText: { width: 32, textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#111827' },
  qtyInput: { width: 44, textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#111827' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  checkoutBtn: { flexDirection: 'row', backgroundColor: '#2f7f74', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checkoutText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});
