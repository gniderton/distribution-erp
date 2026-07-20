import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, RefreshCw, FileText, CheckCircle, AlertCircle, 
  Trash2, Edit, Save, DollarSign, Layers, Tag 
} from 'lucide-react';

export default function Items() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', category_id: '', brand_id: '', tax_rate: 18,
    purchase_price: 0, sale_price: 0, stock: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [prodRes, brandRes, catRes, taxRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/master/brands'),
        fetch('/api/master/categories'),
        fetch('/api/master/taxes')
      ]);

      if (prodRes.ok) {
        const json = await prodRes.json();
        setProducts(json.data || json);
      }
      if (brandRes.ok) setBrands(await brandRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (taxRes.ok) setTaxes(await taxRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          sku: newProduct.sku,
          category_id: parseInt(newProduct.category_id),
          brand_id: parseInt(newProduct.brand_id),
          tax_rate: parseFloat(newProduct.tax_rate),
          purchase_price: parseFloat(newProduct.purchase_price),
          price: parseFloat(newProduct.sale_price),
          opening_stock: parseInt(newProduct.stock)
        })
      });

      if (res.ok) {
        setMessage('Product successfully added to catalog!');
        setNewProduct({
          name: '', sku: '', category_id: '', brand_id: '', tax_rate: 18,
          purchase_price: 0, sale_price: 0, stock: 0
        });
        setShowAddModal(false);
        fetchInitialData();
      } else {
        setMessage('Error: Failed to create product record.');
      }
    } catch (e) {
      console.error(e);
      setMessage('Error: Connection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    (p.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.product_code && p.product_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-text-secondary text-xs mt-0.5">Manage products, brands, categories, tax metrics, and physical stocks.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      <div className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 text-text-secondary" size={16} />
          <input 
            type="text" 
            placeholder="Search items by name, code or SKU..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary text-text-primary placeholder:text-text-secondary"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5"><Layers size={14} /> Brands: {brands.length}</span>
          <span className="flex items-center gap-1.5"><Tag size={14} /> Categories: {categories.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-secondary gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Loading products...
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-border">
              <thead className="bg-background text-text-secondary font-semibold">
                <tr>
                  <th className="p-3">SKU / SKU Code</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Brand</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Purchase Price</th>
                  <th className="p-3 text-right">Sale Price</th>
                  <th className="p-3 text-right">Tax Rate</th>
                  <th className="p-3 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-text-secondary italic">No products matched search rules.</td>
                  </tr>
                ) : (
                  filteredProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/2">
                      <td className="p-3 font-mono font-semibold text-text-secondary">{p.product_code || 'N/A'}</td>
                      <td className="p-3 font-semibold text-text-primary">{p.product_name}</td>
                      <td className="p-3 text-text-secondary">{p.brand_name || 'Generic'}</td>
                      <td className="p-3 text-text-secondary">{p.category_name || 'Generic'}</td>
                      <td className="p-3 text-right font-medium text-red-400">${parseFloat(p.purchase_rate || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-medium text-secondary">${parseFloat(p.distributor_rate || p.price || 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-text-secondary">{p.tax_percentage || 18}%</td>
                      <td className={`p-3 text-right font-bold ${p.current_stock <= 5 ? 'text-amber-500' : 'text-text-primary'}`}>
                        {p.current_stock || 0} units
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-xl overflow-hidden shadow-2xl border border-border">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text-primary">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Del Monte Ketchup 500g"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">SKU / Item Code</label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={e => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="e.g. DM-KET-500"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Tax Rate (GST %)</label>
                  <input
                    type="number"
                    value={newProduct.tax_rate}
                    onChange={e => setNewProduct(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Brand</label>
                  <select
                    value={newProduct.brand_id}
                    onChange={e => setNewProduct(prev => ({ ...prev, brand_id: e.target.value }))}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  >
                    <option value="">-- Select Brand --</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.brand_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Category</label>
                  <select
                    value={newProduct.category_id}
                    onChange={e => setNewProduct(prev => ({ ...prev, category_id: e.target.value }))}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Purchase ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.purchase_price}
                    onChange={e => setNewProduct(prev => ({ ...prev, purchase_price: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Sale Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.sale_price}
                    onChange={e => setNewProduct(prev => ({ ...prev, sale_price: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Initial Stock</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={e => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary text-right"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold hover:bg-white/5 text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="animate-spin" size={12} />}
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
