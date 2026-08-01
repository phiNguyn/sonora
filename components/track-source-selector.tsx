'use client'

import { Filter } from 'lucide-react'

interface TrackSourceSelectorProps {
  selectedSource: string | null
  onSourceChange: (source: string | null) => void
  sources: Array<{ id: string; label: string; count?: number }>
}

export function TrackSourceSelector({
  selectedSource,
  onSourceChange,
  sources,
}: TrackSourceSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span>Source:</span>
      </div>

      <button
        onClick={() => onSourceChange(null)}
        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
          selectedSource === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-muted'
        }`}
      >
        All
      </button>

      {sources.map((source) => (
        <button
          key={source.id}
          onClick={() => onSourceChange(source.source === source.id ? source.id : source.id)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1 ${
            selectedSource === source.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-muted'
          }`}
        >
          {source.label}
          {source.count !== undefined && source.count > 0 && (
            <span className="text-xs opacity-75">({source.count})</span>
          )}
        </button>
      ))}
    </div>
  )
}
