'use client'

import React from 'react'
import { Play } from 'lucide-react'

export interface Track {
  id: string
  title: string
  artist: string
  duration: number
  url?: string
  source?: 'blob' | 'supabase' | 'google_drive' | 'local'
}

interface PlaylistProps {
  tracks: Track[]
  currentTrackId: string
  onSelectTrack: (trackId: string) => void
}

export function Playlist({ tracks, currentTrackId, onSelectTrack }: PlaylistProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-card rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
      <h3 className="text-sm font-semibold text-accent mb-3">Playlist</h3>
      {tracks.map((track, index) => (
        <button
          key={track.id}
          onClick={() => onSelectTrack(track.id)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
            currentTrackId === track.id
              ? 'bg-primary/20 border border-primary/50'
              : 'hover:bg-secondary border border-transparent'
          }`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center bg-secondary">
            {currentTrackId === track.id ? (
              <Play className="w-4 h-4 text-accent fill-accent" />
            ) : (
              <span className="text-xs text-muted-foreground">{index + 1}</span>
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDuration(track.duration)}
          </span>
        </button>
      ))}
    </div>
  )
}
