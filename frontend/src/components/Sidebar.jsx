import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, Truck, DollarSign, 
  Users, Settings, ChevronDown, ChevronRight, Menu, X, 
  FileText, ClipboardList, Database, Briefcase, HelpCircle
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedModule, setExpandedModule] = useState('Procurement');

  const toggleSidebar = () => setIsOpen(!isOpen);

  const modules = [
    {
      name: 'Overview',
      icon: LayoutDashboard,
      items: [
        { name: 'Dashboard', path: '/' },
        { name: 'Reports & P&L', path: '/reports' }
      ]
    },
    {
      name: 'Procurement',
      icon: ShoppingBag,
      items: [
        { name: 'Inventory & GRN', path: '/inventory' },
        { name: 'Vendors', path: '/vendors' },
        { name: 'Debit Notes', path: '/debit-notes' },
        { name: 'Product Catalog', path: '/items' }
      ]
    },
    {
      name: 'Sales & SCM',
      icon: Truck,
      items: [
        { name: 'Sales Orders', path: '/sales-orders' },
        { name: 'Invoices', path: '/invoices' },
        { name: 'Customers', path: '/customers' },
        { name: 'Supply Chain', path: '/supply-chain' },
        { name: 'Credit Notes', path: '/credit-notes' }
      ]
    },
    {
      name: 'Finance & GST',
      icon: DollarSign,
      items: [
        { name: 'Transactions & Bank', path: '/transactions' },
        { name: 'Cheque Management', path: '/cheques' },
        { name: 'GST & GSTR-1', path: '/gst' },
        { name: 'Loans Matrix', path: '/loans' },
        { name: 'Asset Management', path: '/assets' },
        { name: 'Payment Settlement', path: '/settlements' }
      ]
    },
    {
      name: 'Operations & HR',
      icon: Users,
      items: [
        { name: 'HR & Payroll', path: '/hr' },
        { name: 'Incentives Engine', path: '/incentives' },
        { name: 'Letterhead Editor', path: '/letterhead' }
      ]
    },
    {
      name: 'System',
      icon: Settings,
      items: [
        { name: 'Settings', path: '/settings' },
        { name: 'Migration Tools', path: '/migration' }
      ]
    }
  ];

  const handleModuleClick = (name) => {
    if (!isOpen) setIsOpen(true);
    setExpandedModule(expandedModule === name ? null : name);
  };

  return (
    <aside className={`glass-panel min-h-screen text-text-primary flex flex-col transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'} border-r border-border`}>
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        {isOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-md shadow-primary/30">
              G
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-wider">GNIDERTON</h1>
              <span className="text-[10px] text-primary font-medium tracking-widest uppercase">ERP System</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white mx-auto">
            G
          </div>
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors hidden md:block"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Navigation Modules */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isExpanded = expandedModule === mod.name;

          return (
            <div key={mod.name} className="space-y-1">
              <button
                onClick={() => handleModuleClick(mod.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 group ${
                  isExpanded ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isExpanded ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'} />
                  {isOpen && <span>{mod.name}</span>}
                </div>
                {isOpen && (
                  isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                )}
              </button>

              {/* Sub-items */}
              {isOpen && isExpanded && (
                <div className="pl-9 pr-2 py-1 space-y-1 border-l border-border/50 ml-5">
                  {mod.items.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      className={({ isActive }) => 
                        `block px-3 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                          isActive 
                            ? 'text-primary font-semibold bg-primary/5' 
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`
                      }
                    >
                      {item.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Session Details */}
      <div className="p-4 border-t border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 uppercase">
          AD
        </div>
        {isOpen && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate leading-tight">Admin User</p>
            <span className="text-[10px] text-text-secondary leading-none">Super Administrator</span>
          </div>
        )}
      </div>
    </aside>
  );
}
