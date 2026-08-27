import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AssetRegister } from './components/AssetRegister'
import { AssetCategories } from './components/AssetCategories'

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<'register' | 'categories'>('register')

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-12">
      <PageHeader
        eyebrow="AST · Finance"
        title="Asset Management"
        description="Track company assets, run depreciation, manage assignments, and handle disposals."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('register')}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative border-b-2 ${
            activeTab === 'register' 
              ? 'border-brand-500 text-brand-700' 
              : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-border-base'
          }`}
        >
          Asset Register
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative border-b-2 ${
            activeTab === 'categories' 
              ? 'border-brand-500 text-brand-700' 
              : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-border-base'
          }`}
        >
          Asset Categories
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'register' && <AssetRegister />}
        {activeTab === 'categories' && <AssetCategories />}
      </div>
    </div>
  )
}
