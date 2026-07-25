'use client'

import React from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react'

interface PlayerControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onPrevious: () => void
  onNext: () => void
  shuffleEnabled: boolean
  onShuffleToggle: () => void
  repeatMode: 'off' | 'all' | 'one'
  onRepeatToggle: () => void
}

export function PlayerControls({
  isPlaying,
  onPlayPause,
  onPrevious,
  onNext,
  shuffleEnabled,
  onShuffleToggle,
  repeatMode,
  onRepeatToggle,
}: PlayerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {/* Shuffle button */}
      <button
        onClick={onShuffleToggle}
        className={`p-2 rounded-lg transition-all duration-200 ${
          shuffleEnabled
            ? 'bg-accent/20 text-accent'
            : 'text-muted-foreground hover:bg-secondary'
        }`}
        aria-label="Toggle shuffle"
      >
        <Shuffle className="w-5 h-5" />
      </button>

      {/* Previous button */}
      <button
        onClick={onPrevious}
        className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
        aria-label="Previous track"
      >
        <SkipBack className="w-6 h-6" />
      </button>

      {/* Play/Pause button */}
      <button
        onClick={onPlayPause}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-orange-700 hover:from-orange-500 hover:to-orange-800 text-white shadow-lg shadow-primary/50 hover:shadow-primary/70 transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-8 h-8 fill-white" />
        ) : (
          <Play className="w-8 h-8 fill-white ml-1" />
        )}
      </button>

      {/* Next button */}
      <button
        onClick={onNext}
        className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
        aria-label="Next track"
      >
        <SkipForward className="w-6 h-6" />
      </button>

      {/* Repeat button */}
      <button
        onClick={onRepeatToggle}
        className={`p-2 rounded-lg transition-all duration-200 ${
          repeatMode !== 'off'
            ? 'bg-accent/20 text-accent'
            : 'text-muted-foreground hover:bg-secondary'
        }`}
        aria-label="Toggle repeat"
      >
        {repeatMode === 'one' ? (
          <Repeat1 className="w-5 h-5" />
        ) : (
          <Repeat className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}
