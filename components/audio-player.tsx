'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Heart, Download, MoreVertical } from 'lucide-react'
import { WaveformVisualization } from './waveform-visualization'
import { PlayerControls } from './player-controls'
import { ProgressBar } from './progress-bar'
import { VolumeControl } from './volume-control'
import { Playlist, Track } from './playlist'

const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Neon Horizon',
    artist: 'Lumina Collective',
    duration: 222,
  },
  {
    id: '2',
    title: 'Silica Waves',
    artist: 'Lumina Collective',
    duration: 255,
  },
  {
    id: '3',
    title: 'Fractal Dream',
    artist: 'Lumina Collective',
    duration: 238,
  },
  {
    id: '4',
    title: 'Velocity Zero',
    artist: 'Lumina Collective',
    duration: 310,
  },
  {
    id: '5',
    title: 'Prism Shift',
    artist: 'Lumina Collective',
    duration: 165,
  },
  {
    id: '6',
    title: 'Echo Chamber',
    artist: 'Lumina Collective',
    duration: 272,
  },
]

export function AudioPlayer() {
  const [currentTrackId, setCurrentTrackId] = useState<string>('1')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [shuffleEnabled, setShuffleEnabled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [isFavorite, setIsFavorite] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationRef = useRef<number>()

  const currentTrack = SAMPLE_TRACKS.find((t) => t.id === currentTrackId) || SAMPLE_TRACKS[0]

  // Simulate audio progress
  useEffect(() => {
    if (!isPlaying) return

    const simulate = () => {
      setCurrentTime((prev) => {
        const newTime = prev + 0.1
        if (newTime >= currentTrack.duration) {
          handleNext()
          return 0
        }
        return newTime
      })
      animationRef.current = requestAnimationFrame(simulate)
    }

    animationRef.current = requestAnimationFrame(simulate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, currentTrack.duration])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handlePrevious = () => {
    const currentIndex = SAMPLE_TRACKS.findIndex((t) => t.id === currentTrackId)
    const previousIndex = currentIndex === 0 ? SAMPLE_TRACKS.length - 1 : currentIndex - 1
    setCurrentTrackId(SAMPLE_TRACKS[previousIndex].id)
    setCurrentTime(0)
    setIsPlaying(true)
  }

  const handleNext = () => {
    if (repeatMode === 'one') {
      setCurrentTime(0)
      return
    }

    let nextIndex
    if (shuffleEnabled) {
      nextIndex = Math.floor(Math.random() * SAMPLE_TRACKS.length)
    } else {
      const currentIndex = SAMPLE_TRACKS.findIndex((t) => t.id === currentTrackId)
      nextIndex = (currentIndex + 1) % SAMPLE_TRACKS.length
    }

    setCurrentTrackId(SAMPLE_TRACKS[nextIndex].id)
    setCurrentTime(0)

    if (repeatMode !== 'all' && SAMPLE_TRACKS[nextIndex].id === SAMPLE_TRACKS[0].id) {
      setIsPlaying(false)
    }
  }

  const handleShuffleToggle = () => {
    setShuffleEnabled(!shuffleEnabled)
  }

  const handleRepeatToggle = () => {
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off'
    setRepeatMode(nextMode)
  }

  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, currentTrack.duration)))
  }

  const handleTrackSelect = (trackId: string) => {
    setCurrentTrackId(trackId)
    setCurrentTime(0)
    setIsPlaying(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Main Player Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Album Art */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-48 h-48 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/50 overflow-hidden shadow-lg shadow-primary/20">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl opacity-30">♪</div>
              </div>
            </div>
          </div>

          {/* Track Info */}
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-3xl font-bold text-foreground">{currentTrack.title}</h2>
            <p className="text-lg text-muted-foreground">{currentTrack.artist}</p>
          </div>

          {/* Waveform Visualization */}
          <div className="mb-6">
            <WaveformVisualization
              isPlaying={isPlaying}
              progress={currentTime / currentTrack.duration}
            />
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <ProgressBar
              currentTime={currentTime}
              duration={currentTrack.duration}
              onSeek={handleSeek}
            />
          </div>

          {/* Player Controls */}
          <div className="flex justify-center mb-8">
            <PlayerControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onPrevious={handlePrevious}
              onNext={handleNext}
              shuffleEnabled={shuffleEnabled}
              onShuffleToggle={handleShuffleToggle}
              repeatMode={repeatMode}
              onRepeatToggle={handleRepeatToggle}
            />
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isFavorite
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className="w-5 h-5"
                  fill={isFavorite ? 'currentColor' : 'none'}
                />
              </button>
              <button
                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
                aria-label="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <VolumeControl volume={volume} onVolumeChange={setVolume} />
          </div>
        </div>

        {/* Playlist */}
        <Playlist
          tracks={SAMPLE_TRACKS}
          currentTrackId={currentTrackId}
          onSelectTrack={handleTrackSelect}
        />
      </div>

      {/* Hidden audio element for reference */}
      <audio ref={audioRef} />
    </div>
  )
}
