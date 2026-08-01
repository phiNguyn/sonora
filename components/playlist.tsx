'use client'

import React, { useState, useMemo } from 'react'
import { Play, Search, X } from 'lucide-react'

export interface Track {
  id: string
  title: string
  artist: string
  duration: number
  url?: string
  file_path?: string
  source?: 'blob' | 'supabase' | 'google_drive' | 'local'
}

interface PlaylistProps {
  tracks: Track[]
  currentTrackId: string
  onSelectTrack: (trackId: string) => void
}

export function Playlist({ tracks, currentTrackId, onSelectTrack }: PlaylistProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks

    const query = searchQuery.toLowerCase().trim()
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query)
    )
  }, [tracks, searchQuery])

  return (
    <div className="bg-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-accent">Playlist</h3>
        {searchQuery && (
          <span className="text-xs text-muted-foreground">
            {filteredTracks.length} / {tracks.length}
          </span>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-1  pr-1">
        {filteredTracks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tracks found
          </div>
        ) : (
          filteredTracks.map((track, index) => (
            <button
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${currentTrackId === track.id
                ? 'bg-primary/20 border border-primary/50'
                : 'hover:bg-secondary border border-transparent'
                }`}
            >
              <div className="w-8 h-8 rounded flex items-center justify-center bg-secondary shrink-0">
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
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDuration(track.duration)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
