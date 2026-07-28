import React, { useRef, useState, useEffect } from 'react';
import { Workbook } from '@fortune-sheet/react';
import type { WorkbookInstance } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Download, Save, Trash2, Upload, FileJson } from 'lucide-react';
import toast from 'react-hot-toast';
import * as ExcelJS from 'exceljs';

const STORAGE_KEY = 'erp_scratchpad_data';

export default function ScratchpadPage() {
  const workbookRef = useRef<WorkbookInstance>(null);
  const [initialData, setInitialData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from local storage on mount
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setInitialData(JSON.parse(saved));
      } else {
        setInitialData([{ name: 'Sheet1' }]);
      }
    } catch (e) {
      setInitialData([{ name: 'Sheet1' }]);
    }
    setLoading(false);
  }, []);

  const handleExportJson = () => {
    if (!workbookRef.current) return;
    const data = workbookRef.current.getAllSheets();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scratchpad_Draft_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Draft exported! You can email this to yourself and import it later.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
          toast.success('Draft imported successfully!');
          window.location.reload();
        } else {
          toast.error('Invalid draft format');
        }
      } catch (err) {
        toast.error('Failed to parse draft file');
      }
    };
    reader.readAsText(file);
    // clear input
    e.target.value = '';
  };

  const handleSaveDraft = () => {
    if (workbookRef.current) {
      const data = workbookRef.current.getAllSheets();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      toast.success('Scratchpad saved as draft!');
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      // To force re-render with empty data, we can reload or reset state
      window.location.reload();
    }
  };

  const handleExportExcel = async () => {
    if (!workbookRef.current) return;
    try {
      const sheets = workbookRef.current.getAllSheets();
      const workbook = new ExcelJS.Workbook();
      
      sheets.forEach((sheet: any) => {
        const worksheet = workbook.addWorksheet(sheet.name);
        
        // Very basic export: just values
        if (sheet.celldata) {
          sheet.celldata.forEach((cell: any) => {
            if (cell && cell.r !== undefined && cell.c !== undefined && cell.v) {
              const row = cell.r + 1; // exceljs is 1-indexed
              const col = cell.c + 1;
              const excelCell = worksheet.getCell(row, col);
              // Set value
              if (cell.v.v !== undefined) {
                excelCell.value = cell.v.v;
              } else if (cell.v.m !== undefined) {
                excelCell.value = cell.v.m; // text
              }
            }
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Scratchpad_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Exported to Excel!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export to Excel');
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] pb-4">
      <PageHeader
        eyebrow="Tools"
        title="Rough Scratchpad"
        description="Excel-like calculations, saved locally to your browser."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleClear} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200" title="Wipe Scratchpad">
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-px bg-border-subtle mx-1" />

            <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-border-subtle bg-white text-ink-900 hover:bg-ink-50 cursor-pointer transition-colors shadow-sm">
              <Upload className="h-4 w-4" /> Import Draft
              <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            </label>
            <Button variant="secondary" onClick={handleExportJson} title="Export Raw Draft (.json)">
              <FileJson className="h-4 w-4 mr-2" /> Export Draft
            </Button>

            <div className="h-6 w-px bg-border-subtle mx-1" />

            <Button variant="secondary" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-2" /> Save to Browser
            </Button>
            <Button variant="primary" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" /> Export to Excel
            </Button>
          </div>
        }
      />
      
      <div className="flex-1 mt-4 border border-border-subtle rounded-xl overflow-hidden bg-white shadow-sm relative">
        {/* FortuneSheet needs an absolute container */}
        <div className="absolute inset-0">
          <Workbook 
            ref={workbookRef} 
            data={initialData} 
            onChange={(data) => {
              // Optionally autosave, but doing it on button click is safer for performance
            }}
          />
        </div>
      </div>
    </div>
  );
}
