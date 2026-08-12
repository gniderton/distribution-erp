import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'

interface Option {
  value: string | number
  label: string
}

interface Props {
  options: Option[]
  value: string | number
  onChange: (val: string | number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Select...', className = '', disabled = false }: Props) {
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
    function handleScroll() {
      if (open) setOpen(false) // Close on scroll to prevent floating detached menu
    }
    if (open) {
      window.addEventListener('scroll', handleScroll, true) // capture phase to catch all scrolling containers
    }
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [open])

  const selectedOption = options.find(o => o.value === value)
  
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={`relative ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={containerRef}>
      <div 
        className={`h-9 w-full rounded-lg border border-border-subtle bg-white px-2 flex items-center justify-between text-sm ${disabled ? 'bg-surface cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={`truncate ${!selectedOption ? 'text-ink-400' : 'text-ink-900'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="text-ink-400 shrink-0 ml-1" />
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
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-ink-400 text-center">No results found</div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`p-2 text-sm cursor-pointer hover:bg-brand-50 hover:text-brand-700 ${opt.value === value ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-900'}`}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
