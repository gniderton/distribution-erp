import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { itemsApi } from '../api'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { UploadCloud, Download } from 'lucide-react'

export function BulkImportModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await itemsApi.import(formData)
      toast.success('Products imported successfully')
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to import products')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const headers = [
      'Product Name', 'Product Code', 'Brand', 'Category', 
      'Base Unit', 'Alternate Unit', 'Conversion', 
      'HSN', 'Tax', 
      'MRP', 'Retail Rate', 'Wholesale Rate', 'Dealer Rate', 'Distributor Rate', 'Purchase Rate', 
      'Opening Stock'
    ]
    
    // Add one sample row
    const sampleRow = [
      'Sample Item 240ML', 'SAMP-001', 'Sample Brand', 'Beverages',
      'PCS', 'BOX', '10',
      '2202', '18',
      '100', '95', '85', '85', '80', '60',
      '50'
    ]

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), sampleRow.join(',')].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "product_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Import Products">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-ink-600">
            Upload an Excel (.xlsx) or CSV file containing your product catalog.
          </div>
          <Button variant="secondary" size="sm" onClick={handleDownloadTemplate} className="text-xs">
            <Download className="w-4 h-4 mr-1" /> Template
          </Button>
        </div>

        <div className="border-2 border-dashed border-border-subtle rounded-xl p-8 text-center bg-ink-50 hover:bg-ink-100 transition-colors cursor-pointer relative">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                setFile(e.target.files[0])
              }
            }}
          />
          <UploadCloud className="h-10 w-10 text-ink-400 mx-auto mb-3" />
          {file ? (
            <div>
              <p className="text-sm font-medium text-brand-600">{file.name}</p>
              <p className="text-xs text-ink-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-ink-900">Click or drag file to upload</p>
              <p className="text-xs text-ink-500 mt-1">CSV or Excel up to 5MB</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={loading || !file} loading={loading}>
            Import File
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
