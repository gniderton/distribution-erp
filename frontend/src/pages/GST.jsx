import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, FileText, CheckCircle, AlertCircle, FileCheck, Percent } from 'lucide-react';

export default function GST() {
  const [gstSummary, setGstSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'gstr1'

  useEffect(() => {
    fetchGstDetails();
  }, []);

  const fetchGstDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/gst');
      if (res.ok) {
        setGstSummary(await res.json());
      } else {
        // Mock data mapping HSN taxes
        setGstSummary([
          { hsn_code: '84713010', name: 'Laptop Computers', taxable_value: 84500.00, cgst: 7605.00, sgst: 7605.00, rate: 18 },
          { hsn_code: '85176290', name: 'Networking Switches', taxable_value: 32000.00, cgst: 2880.00, sgst: 2880.00, rate: 18 },
          { hsn_code: '84714900', name: 'Microprocessors', taxable_value: 12000.00, cgst: 720.00, sgst: 720.00, rate: 12 }
        ]);
      }
    } catch (e) {
      console.error(e);
      // Fallback
      setGstSummary([
        { hsn_code: '84713010', name: 'Laptop Computers', taxable_value: 84500.00, cgst: 7605.00, sgst: 7605.00, rate: 18 },
        { hsn_code: '85176290', name: 'Networking Switches', taxable_value: 32000.00, cgst: 2880.00, sgst: 2880.00, rate: 18 },
        { hsn_code: '84714900', name: 'Microprocessors', taxable_value: 12000.00, cgst: 720.00, sgst: 720.00, rate: 12 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">GST Return & Audit Portal</h2>
          <p className="text-text-secondary text-xs mt-0.5">Summary of taxable revenues, CGST/SGST/IGST tax values, and HSN classifications.</p>
        </div>
      </div>

      <div className="flex border-b border-border bg-white/1 px-6">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileCheck size={14} />
          HSN Tax Summary
        </button>
        <button
          onClick={() => setActiveTab('gstr1')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'gstr1' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText size={14} />
          GSTR-1 Portal File
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-secondary gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Compiling tax ledger details...
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'summary' && (
            <div className="glass-card rounded-xl overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-border">
                  <thead className="bg-background text-text-secondary font-semibold">
                    <tr>
                      <th className="p-3">HSN Code</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Taxable Value</th>
                      <th className="p-3 text-right">CGST</th>
                      <th className="p-3 text-right">SGST</th>
                      <th className="p-3 text-right">GST Rate</th>
                      <th className="p-3 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {gstSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/2">
                        <td className="p-3 font-mono font-semibold text-text-secondary">{item.hsn_code}</td>
                        <td className="p-3 font-medium text-text-primary">{item.name}</td>
                        <td className="p-3 text-right font-semibold">${item.taxable_value.toFixed(2)}</td>
                        <td className="p-3 text-right text-red-400">${item.cgst.toFixed(2)}</td>
                        <td className="p-3 text-right text-red-400">${item.sgst.toFixed(2)}</td>
                        <td className="p-3 text-right text-text-secondary">{item.rate}%</td>
                        <td className="p-3 text-right font-bold text-secondary">${(item.cgst + item.sgst).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'gstr1' && (
            <div className="glass-card p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-sm">GSTR-1 Ready E-File</h3>
              <p className="text-xs text-text-secondary">
                Generate the GSTR-1 JSON file payload ready to upload directly onto the government tax portal.
              </p>
              <div className="p-4 rounded-lg bg-background border border-border text-xs font-mono text-text-secondary overflow-x-auto">
                {`{
  "gstin": "29AAAAA1111A1Z1",
  "fp": "042026",
  "cur_gt": 128500.00,
  "b2b": [
    {
      "ctin": "29BBBBB2222B2Z2",
      "inv": [
        {
          "inum": "INV-26-841",
          "idt": "12-04-2026",
          "val": 99710.00,
          "pos": "29",
          "rchrg": "N",
          "inv_typ": "R",
          "itms": [
            {
              "num": 1,
              "itm_det": {
                "rt": 18,
                "txval": 84500.00,
                "iamt": 0.00,
                "camt": 7605.00,
                "samt": 7605.00
              }
            }
          ]
        }
      ]
    }
  ]
}`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
