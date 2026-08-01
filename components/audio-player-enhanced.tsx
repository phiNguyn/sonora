'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Heart, Download, MoreVertical, Upload } from 'lucide-react'
import { WaveformVisualization } from './waveform-visualization'
import { PlayerControls } from './player-controls'
import { ProgressBar } from './progress-bar'
import { VolumeControl } from './volume-control'
import { Playlist, Track } from './playlist'
import { AudioUploadModal } from './audio-upload-modal'
import { TrackSourceSelector } from './track-source-selector'

const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Neon Horizon',
    artist: 'Lumina Collective',
    duration: 222,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    source: 'blob',
  },
  {
    id: '2',
    title: 'Silica Waves',
    artist: 'Lumina Collective',
    duration: 255,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    source: 'blob',
  },
]

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tracks, setTracks] = useState<Track[]>(SAMPLE_TRACKS)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const currentTrack = tracks[currentTrackIndex]
  const filteredTracks = selectedSource
    ? tracks.filter((t) => t.source === selectedSource)
    : tracks

  // Load tracks from database
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (selectedSource) {
          params.append('source', selectedSource)
        }

        const response = await fetch(`/api/tracks?${params}`)
        const data = await response.json()

        if (data.success && data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks)
          setCurrentTrackIndex(0)
        } else {
          // Use sample tracks if no data from DB
          setTracks(SAMPLE_TRACKS)
        }
      } catch (error) {
        console.error('Failed to load tracks:', error)
        setTracks(SAMPLE_TRACKS)
      } finally {
        setLoading(false)
      }
    }

    fetchTracks()
  }, [selectedSource])

  // Update audio element src when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack?.url) {
      audioRef.current.src = currentTrack.url
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          // CORS or other playback issues
          console.error('Failed to play audio')
        })
      }
    }
  }, [currentTrack])

  // Handle audio events
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
    } else {
      handleNext()
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack?.url) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {
        console.error('Playback failed')
      })
    }
    setIsPlaying(!isPlaying)
  }

  const handlePrevious = () => {
    if (currentTime > 3) {
      // Restart current track if more than 3 seconds in
      if (audioRef.current) {
        audioRef.current.currentTime = 0
      }
      setCurrentTime(0)
    } else {
      const newIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1
      setCurrentTrackIndex(newIndex)
    }
  }

  const handleNext = () => {
    let newIndex = currentTrackIndex + 1

    if (isShuffle) {
      newIndex = Math.floor(Math.random() * tracks.length)
    } else if (newIndex >= tracks.length) {
      if (repeatMode === 'all') {
        newIndex = 0
      } else {
        newIndex = tracks.length - 1
      }
    }

    setCurrentTrackIndex(newIndex)
    setCurrentTime(0)
  }

  const handleSeek = (time: number) => {
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const handleSelectTrack = (trackId: string) => {
    const index = tracks.findIndex((t) => t.id === trackId)
    if (index !== -1) {
      setCurrentTrackIndex(index)
      setCurrentTime(0)
      setIsPlaying(true)
    }
  }

  const toggleRepeat = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one']
    const currentIndex = modes.indexOf(repeatMode)
    setRepeatMode(modes[(currentIndex + 1) % modes.length])
  }

  const handleUploadSuccess = () => {
    // Refresh tracks from database
    const fetchTracks = async () => {
      try {
        const params = new URLSearchParams()
        if (selectedSource) {
          params.append('source', selectedSource)
        }

        const response = await fetch(`/api/tracks?${params}`)
        const data = await response.json()

        if (data.success && data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks)
        }
      } catch (error) {
        console.error('Failed to refresh tracks:', error)
      }
    }

    fetchTracks()
  }

  const sourceCounts = {
    blob: tracks.filter((t) => t.source === 'blob').length,
    supabase: tracks.filter((t) => t.source === 'supabase').length,
    google_drive: tracks.filter((t) => t.source === 'google_drive').length,
  }

  const sourceOptions = [
    { id: 'blob', label: 'Vercel Blob', count: sourceCounts.blob },
    { id: 'supabase', label: 'Supabase', count: sourceCounts.supabase },
    { id: 'google_drive', label: 'Google Drive', count: sourceCounts.google_drive },
  ].filter((s) => s.count > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background/50 p-4 md:p-8">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Music Player</h1>
            <p className="text-muted-foreground mt-1">
              {loading ? 'Loading tracks...' : `${filteredTracks.length} tracks available`}
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Track
          </button>
        </div>

        {/* Source Selector */}
        {sourceOptions.length > 0 && (
          <div className="mb-6">
            <TrackSourceSelector
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
              sources={sourceOptions}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Album Art & Now Playing Info */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 aspect-square max-h-80 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent" />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="w-24 h-24 rounded-full bg-primary/30 mx-auto flex items-center justify-center">
                  <div className="text-foreground text-5xl">♪</div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground text-balance">
                    {currentTrack?.title || 'Select a track'}
                  </h2>
                  <p className="text-muted-foreground">{currentTrack?.artist || 'No artist'}</p>
                </div>
              </div>
            </div>

            {/* Waveform */}
            {currentTrack?.url && (
              <WaveformVisualization
                isPlaying={isPlaying}
                progress={duration ? currentTime / duration : 0}
              />
            )}

            {/* Progress Bar */}
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />

            {/* Player Controls */}
            <PlayerControls
              isPlaying={isPlaying}
              isShuffle={isShuffle}
              repeatMode={repeatMode}
              onPlayPause={togglePlayPause}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onShuffle={() => setIsShuffle(!isShuffle)}
              onRepeat={toggleRepeat}
            />

            {/* Additional Controls */}
            <div className="flex justify-between items-center gap-4">
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isFavorited
                    ? 'bg-primary/20 text-accent'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <Heart
                  className="w-5 h-5"
                  fill={isFavorited ? 'currentColor' : 'none'}
                />
                Favorite
              </button>

              <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted transition-colors">
                <Download className="w-5 h-5" />
                Download
              </button>

              <button className="flex items-center justify-center w-10 h-10 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Volume Control */}
              <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
            </div>
          </div>

          {/* Playlist */}
          <Playlist
            tracks={filteredTracks}
            currentTrackId={currentTrack?.id || ''}
            onSelectTrack={handleSelectTrack}
          />
        </div>
      </div>

      {/* Upload Modal */}
      <AudioUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  )
}
