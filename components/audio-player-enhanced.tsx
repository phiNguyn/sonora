'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Heart, Download, Upload, Shuffle, SkipBack, SkipForward, Repeat, Repeat1, Play, Pause } from 'lucide-react'
import { VolumeControl } from './volume-control'
import { Playlist, Track } from './playlist'
import { AudioUploadModal } from './audio-upload-modal'
import { TrackSourceSelector } from './track-source-selector'

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const isLocalEnv = process.env.NODE_ENV === 'development'

// Helper function to convert URLs to playable format
function getPlayableUrl(track: Track): string {
  if (!track.url) return ''

  // If it's a Google Drive URL, use our proxy
  if (track.source === 'google_drive' && track.file_path) {
    return `/api/proxy/google-drive?fileId=${track.file_path}`
  }

  // Private Vercel Blob files must be streamed via our API (browser cannot use the raw URL)
  if (track.source === 'blob' && track.url) {
    return `/api/proxy/blob?url=${encodeURIComponent(track.url)}`
  }

  // For Supabase Storage, use direct public URL
  if (track.source === 'supabase') {
    return track.url
  }

  // Default: use URL as-is
  return track.url
}

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

  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying

  const playCurrentTrack = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.url) return false

    const playableUrl = getPlayableUrl(currentTrack)
    const resolvedSrc = new URL(playableUrl, window.location.origin).href
    if (audio.src !== resolvedSrc) {
      audio.src = playableUrl
      audio.load()
    }

    if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          cleanup()
          resolve()
        }
        const onError = () => {
          cleanup()
          reject(new Error('Failed to load audio'))
        }
        const cleanup = () => {
          audio.removeEventListener('canplay', onReady)
          audio.removeEventListener('error', onError)
        }
        audio.addEventListener('canplay', onReady)
        audio.addEventListener('error', onError)
      })
    }

    await audio.play()
    return true
  }, [currentTrack])

  // Update audio element src when track changes; keep playing if user was already playing
  useEffect(() => {
    if (!audioRef.current || !currentTrack?.url) return

    const playableUrl = getPlayableUrl(currentTrack)
    audioRef.current.src = playableUrl
    audioRef.current.load()

    if (isPlayingRef.current) {
      playCurrentTrack().catch((error) => {
        console.error('Failed to play audio', error)
        setIsPlaying(false)
      })
    }
  }, [currentTrack, playCurrentTrack])

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

  const togglePlayPause = async () => {
    if (!audioRef.current || !currentTrack?.url) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    try {
      await playCurrentTrack()
      setIsPlaying(true)
    } catch (error) {
      console.error('Playback failed', error)
      setIsPlaying(false)
    }
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
    <div className="min-h-screen bg-linear-to-br from-background via-secondary to-background/50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-8 pb-36">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Music Player</h1>
            <p className="text-muted-foreground mt-1">
              {loading ? 'Loading tracks...' : `${filteredTracks.length} tracks available`}
            </p>
          </div>
          {/* Show Add Tracks button only in local/development environment */}
          {isLocalEnv && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Add Tracks
            </button>
          )}
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

        {/* Playlist */}
        <Playlist
          tracks={filteredTracks}
          currentTrackId={currentTrack?.id || ''}
          onSelectTrack={handleSelectTrack}
        />
      </div>

      {/* Fixed Bottom Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-3 md:p-4">
        <div className="max-w-7xl mx-auto">
          {/* Mobile: Stack vertically, Desktop: Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            {/* Left: Album Art + Track Info */}
            <div className="flex items-center gap-3 w-full md:w-64 md:shrink-0">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-linear-to-br from-primary/30 to-accent/30 flex items-center justify-center shrink-0">
                <div className="text-foreground text-xl md:text-2xl">♪</div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentTrack?.title || 'No track selected'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentTrack?.artist || 'Unknown artist'}
                </p>
              </div>
            </div>

            {/* Center: Controls + Progress */}
            <div className="flex flex-col items-center gap-2 w-full md:flex-1 order-last md:order-none">
              {/* Controls */}
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-1.5 md:p-2 rounded-lg transition-colors ${isShuffle ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePrevious}
                  className="p-1.5 md:p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <button
                  onClick={togglePlayPause}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className="p-1.5 md:p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className={`p-1.5 md:p-2 rounded-lg transition-colors ${repeatMode !== 'off' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xs md:max-w-md flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full cursor-pointer group relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const percent = (e.clientX - rect.left) / rect.width
                    handleSeek(percent * duration)
                  }}>
                  <div
                    className="absolute h-full bg-primary rounded-full"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }} />
                </div>
                <span className="text-xs text-muted-foreground w-10">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right: Actions + Volume */}
            <div className="flex items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-2 rounded-lg transition-colors ${isFavorited ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Heart className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} />
              </button>

              <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <Download className="w-5 h-5" />
              </button>

              <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
            </div>
          </div>
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
