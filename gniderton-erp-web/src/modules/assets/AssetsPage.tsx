import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AssetRegister } from './components/AssetRegister'
import { AssetVendors } from './components/AssetVendors'
// Note: We'll create AssetCategories and AssetAccounts next.
import { AssetCategories } from './components/AssetCategories'
import { AssetAccounts } from './components/AssetAccounts'
import { LayoutList, Tags, Users, Wallet } from 'lucide-react'

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<'register' | 'vendors' | 'categories' | 'accounts'>('register')

  const tabs = [
    { id: 'register', label: 'Asset Register', icon: LayoutList },
    { id: 'vendors', label: 'Entities', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="AST · Finance"
        title="Asset Management"
        description="Track company assets, run depreciation, manage assignments, and handle disposals."
      />

      {/* Tabs */}
      <div className="flex border-y border-border-subtle mt-6 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[2px] transition-all ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'register' && <AssetRegister />}
        {activeTab === 'vendors' && <AssetVendors />}
        {activeTab === 'categories' && <AssetCategories />}
        {activeTab === 'accounts' && <AssetAccounts />}
      </div>
    </div>
  )
}
