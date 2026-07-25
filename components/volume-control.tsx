'use client'

import React from 'react'
import { Volume2, VolumeX } from 'lucide-react'

interface VolumeControlProps {
  volume: number
  onVolumeChange: (volume: number) => void
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value))
  }

  const toggleMute = () => {
    onVolumeChange(volume === 0 ? 0.5 : 0)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
      >
        {volume === 0 ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>
      <div className="relative w-24 h-1 bg-secondary rounded-full cursor-pointer group">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
          aria-label="Volume"
        />
        <div
          className="absolute h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-75 pointer-events-none"
          style={{ width: `${volume * 100}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ left: `${volume * 100}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
    </div>
  )
}
