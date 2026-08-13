import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'

interface Option {
  value: string | number
  label: string
}

interface Props {
  options: Option[]
  value: (string | number)[]
  onChange: (val: (string | number)[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MultiSearchableSelect({ options, value, onChange, placeholder = 'Select...', className = '', disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDropdownStyle({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    function handleScroll(e: Event) {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      if (open) setOpen(false) // Close on scroll to prevent floating detached menu
    }
    if (open) {
      window.addEventListener('scroll', handleScroll, true) // capture phase to catch all scrolling containers
    }
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [open])

  const toggleOption = (optionValue: string | number) => {
    const safeValue = value || []
    if (safeValue.includes(optionValue)) {
      onChange(safeValue.filter(v => v !== optionValue))
    } else {
      onChange([...safeValue, optionValue])
    }
    inputRef.current?.focus()
  }

  const safeValue = value || []
  const selectedLabels = safeValue.map(v => (options || []).find(o => o.value == v)?.label).filter(Boolean).join(', ')
  
  const filteredOptions = (options || []).filter(o => 
    (o.label || '').toString().toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className={`w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm flex items-center justify-between cursor-pointer transition ${
          disabled ? 'opacity-50 cursor-not-allowed bg-surface' : 'hover:border-brand-300'
        } ${open ? 'border-brand-400 ring-2 ring-brand-400 ring-opacity-20' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={`truncate ${safeValue.length ? 'text-ink-900' : 'text-ink-600/40'}`}>
          {safeValue.length ? selectedLabels : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && createPortal(
        <div 
          ref={dropdownRef}
          className="absolute z-[9999] bg-white border border-border-subtle rounded-lg shadow-lg max-h-60 flex flex-col"
          style={dropdownStyle}
        >
          <div className="p-2 border-b border-border-subtle flex items-center gap-2">
            <Search size={14} className="text-ink-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full text-sm outline-none placeholder:text-ink-300"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = safeValue.includes(option.value)
                return (
                  <div
                    key={option.value}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors flex justify-between items-center ${
                      isSelected ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface text-ink-900'
                    }`}
                    onClick={() => toggleOption(option.value)}
                  >
                    <span>{option.label}</span>
                    {isSelected && <span className="text-brand-600 font-bold">✓</span>}
                  </div>
                )
              })
            ) : (
              <div className="p-3 text-sm text-ink-400 text-center">No results found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
