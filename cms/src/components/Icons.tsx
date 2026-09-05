// Lightweight inline SVG icon set (no external icon library needed)
interface IconProps {
  size?: number
  className?: string
}

const base = (size?: number) => ({
  width: size || 18,
  height: size || 18,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const PlayIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
  </svg>
)

export const LayersIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
)

export const TagIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const GlobeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

export const SendIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

// Publish badge — vector recreation of the provided app-icon art: a light paper
// plane on a dark indigo rounded square. Fixed colours by design (image replica),
// unlike the rest of the set which strokes with currentColor.
export const PublishIcon = ({ size, className }: IconProps) => (
  <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="5.6" fill="#251C4B" />
    <polygon points="19.2 5.2 14.4 19.6 11 13 4.2 10.6" fill="#EEF0FA" />
    <line x1="17.2" y1="7.2" x2="11" y2="13" stroke="#251C4B" strokeWidth="1.5" />
  </svg>
)

export const SearchIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export const LogoutIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export const PlusIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const TrashIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

export const DotsIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" />
  </svg>
)

export const FilterIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)

export const ChevronDownIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export const ChevronLeftIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

export const ChevronRightIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// Section icons for the ShowsList filter dropdown (match the design)
export const SectionsIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

export const FeaturedIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

export const SeriesIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <polyline points="8 21 12 17 16 21" />
  </svg>
)

export const MinisodesIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="2" y="3" width="20" height="18" rx="3" />
    <path d="M2 8h20" />
    <path d="M7 3v5" />
    <path d="M17 3v5" />
    <circle cx="8" cy="14" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="16" cy="14" r="1.4" fill="currentColor" stroke="none" />
  </svg>
)

export const SongsIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)

export const StatusIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="8 12 11 15 16 9" />
  </svg>
)

export const FolderIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

export const CalendarIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

export const HistoryIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 3v5h5" />
    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
)

export const RefreshIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)
