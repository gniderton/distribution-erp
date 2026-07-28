import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { itemsApi } from '../api'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { UploadCloud, Download } from 'lucide-react'
import Papa from 'papaparse'
import { useBrands, useCategories, useVendors, useTaxes, useHsn } from '../hooks'

export function BulkImportModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const { data: vendors } = useVendors()
  const { data: taxes } = useTaxes()
  const { data: hsn } = useHsn()

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const mappedItems = results.data.map((row: any, index: number) => {
            // Find IDs by Name
            const brand = brands?.find((b: any) => b.brand_name?.toLowerCase() === row['Brand Name']?.toLowerCase())
            const category = categories?.find((c: any) => c.category_name?.toLowerCase() === row['Category Name']?.toLowerCase())
            const vendor = vendors?.find((v: any) => v.vendor_name?.toLowerCase() === row['Vendor Name']?.toLowerCase())
            const tax = taxes?.find((t: any) => t.tax_name?.toLowerCase() === row['Tax Name']?.toLowerCase())
            const hsnRecord = hsn?.find((h: any) => h.hsn_code?.toString() === row['HSN Code']?.toString())

            if (!brand) throw new Error(`Row ${index + 1}: Brand "${row['Brand Name']}" not found`)
            if (!category) throw new Error(`Row ${index + 1}: Category "${row['Category Name']}" not found`)
            if (!vendor) throw new Error(`Row ${index + 1}: Vendor "${row['Vendor Name']}" not found`)
            if (!row['Product Name']) throw new Error(`Row ${index + 1}: Product Name is required`)

            return {
              brand_id: brand.id,
              category_id: category.id,
              vendor_id: vendor.id,
              tax_id: tax?.id || null,
              hsn_id: hsnRecord?.id || null,
              product_name: row['Product Name'],
              mrp: Number(row['MRP']) || 0,
              purchase_rate: Number(row['Purchase Rate']) || 0,
              distributor_rate: Number(row['Distributor Rate']) || 0,
              wholesale_rate: Number(row['Wholesale Rate']) || 0,
              dealer_rate: Number(row['Dealer Rate']) || 0,
              retail_rate: Number(row['Retail Rate']) || 0,
              ean_code: row['EAN'] || null,
              case_quantity: Number(row['Case Qty']) || 1,
              uom: row['UOM'] || 'Pcs',
              model_number: row['Model Number'] || null,
              min_stock_level: Number(row['Min Stock']) || 0,
              box_length_cm: Number(row['Length(cm)']) || null,
              box_width_cm: Number(row['Width(cm)']) || null,
              box_height_cm: Number(row['Height(cm)']) || null,
              weight_kg: Number(row['Weight(kg)']) || null,
              description: row['Description'] || null
            }
          })

          await itemsApi.import({ items: mappedItems })
          toast.success('Products imported successfully')
          qc.invalidateQueries({ queryKey: ['products'] })
          onClose()
        } catch (err: any) {
          toast.error(err.message || 'Failed to import products')
        } finally {
          setLoading(false)
        }
      },
      error: (error) => {
        toast.error(`CSV Parsing Error: ${error.message}`)
        setLoading(false)
      }
    })
  }

  const handleDownloadTemplate = () => {
    const headers = [
      'Product ID', 'Product Name', 'Brand Name', 'Category Name', 'Vendor Name', 
      'MRP', 'Purchase Rate', 'Distributor Rate', 'Wholesale Rate', 'Dealer Rate', 'Retail Rate', 
      'Tax Name', 'HSN Code', 'EAN', 'Case Qty', 'UOM', 'Model Number', 
      'Min Stock', 'Length(cm)', 'Width(cm)', 'Height(cm)', 'Weight(kg)', 'Description'
    ]
    
    // Add one sample row (Product ID left empty for new products)
    const sampleRow = [
      '', 'Sample Item 240ML', 'Sample Brand', 'Beverages', 'Sample Vendor',
      '100', '60', '80', '85', '85', '95',
      'GST 18%', '2202', '1234567890123', '10', 'PCS', 'MOD-123',
      '50', '10', '10', '20', '0.5', 'A sample description'
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
