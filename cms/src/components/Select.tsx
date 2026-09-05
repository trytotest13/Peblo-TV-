/**
 * Custom Select / Dropdown — matches the design in the mockup.
 *
 * Features:
 * - Custom trigger (not native <select>) so we can style the leading icon
 *   and rounded container the way the design wants.
 * - Click-outside / Escape close behaviour
 * - Keyboard navigation (ArrowUp/Down, Enter, Home/End)
 * - Controlled value (parent owns the state)
 * - Optional "All" placeholder option
 * - Optional renderOption({ value, label, isSelected, isActive }) for icons
 */
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDownIcon } from './Icons'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  ariaLabel: string
  className?: string
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  ariaLabel,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listboxId = useId()

  const selected = options.find((o) => o.value === value)
  const isPlaceholder = !selected

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Close on Escape; focus the trigger when closed
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // When opened, move keyboard focus to the active option
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
      el?.focus()
    }
  }, [open, activeIndex])

  function handleTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      // Active starts on currently selected (or 0)
      const idx = Math.max(
        0,
        options.findIndex((o) => o.value === value)
      )
      setActiveIndex(idx === -1 ? 0 : idx)
      setOpen(true)
    }
  }

  function handleListKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(options.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const opt = options[activeIndex]
      if (opt) {
        onChange(opt.value)
        setOpen(false)
        triggerRef.current?.focus()
      }
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={`neko-select ${open ? 'open' : ''} ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`neko-select-trigger ${isPlaceholder ? 'placeholder' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKey}
      >
        {selected?.icon && <span className="neko-select-leading-icon">{selected.icon}</span>}
        <span className="neko-select-label">{selected?.label ?? placeholder}</span>
        <span className="neko-select-caret" aria-hidden="true">
          <ChevronDownIcon size={16} />
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          className="neko-select-listbox"
          onKeyDown={handleListKey}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value
            const isActive = idx === activeIndex
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                data-idx={idx}
                tabIndex={-1}
                className={`neko-select-option ${isSelected ? 'selected' : ''} ${
                  isActive ? 'active' : ''
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
              >
                {opt.icon && <span className="neko-select-option-icon">{opt.icon}</span>}
                <span className="neko-select-option-label">{opt.label}</span>
                {isSelected && (
                  <span className="neko-select-check" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
