'use client'

import { useState, useCallback } from 'react'
import { Upload, X, AlertCircle, FileAudio, CheckCircle, Loader2 } from 'lucide-react'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: () => void
}

interface FileQueueItem {
  id: string
  file: File
  title: string
  artist: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function AudioUploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [uploadMethod, setUploadMethod] = useState<'blob' | 'supabase' | 'google-drive'>('blob')
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single')
  const [file, setFile] = useState<File | null>(null)
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([])
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [googleDriveUrl, setGoogleDriveUrl] = useState('')
  const [googleDriveFileId, setGoogleDriveFileId] = useState('')
  const [defaultArtist, setDefaultArtist] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith('audio/')) {
        setError('Please select an audio file')
        return
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB')
        return
      }
      setFile(selectedFile)
      setError(null)
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validFiles: FileQueueItem[] = []
    let hasError = false

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('audio/') && !isAudioExtension(file.name)) {
        hasError = true
        continue
      }
      if (file.size > 50 * 1024 * 1024) {
        hasError = true
        continue
      }
      validFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: defaultArtist,
        status: 'pending',
      })
    }

    if (hasError) {
      setError('Some files were skipped (not audio or too large)')
    }

    setFileQueue(validFiles)
    setError(null)
  }

  const isAudioExtension = (filename: string) => {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus', '.weba']
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
    return audioExtensions.includes(ext)
  }

  const updateQueueItem = (id: string, updates: Partial<FileQueueItem>) => {
    setFileQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const updateAllArtists = (artist: string) => {
    setFileQueue((prev) => prev.map((item) => ({ ...item, artist })))
  }

  const removeFromQueue = (id: string) => {
    setFileQueue((prev) => prev.filter((item) => item.id !== id))
  }

  const handleBatchUpload = async () => {
    if (fileQueue.length === 0) {
      setError('Please select files to upload')
      return
    }

    if (!uploadMethod) {
      setError('Please select upload method')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const endpoint =
        uploadMethod === 'blob' ? '/api/tracks/upload-blob' : '/api/tracks/upload-supabase'

      let successCount = 0
      let errorCount = 0

      for (const item of fileQueue) {
        if (item.status === 'success') continue

        updateQueueItem(item.id, { status: 'uploading' })

        try {
          const formData = new FormData()
          formData.append('file', item.file)
          formData.append('title', item.title)
          formData.append('artist', item.artist || defaultArtist)

          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Upload failed')
          }

          updateQueueItem(item.id, { status: 'success' })
          successCount++
        } catch (err) {
          updateQueueItem(item.id, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Upload failed',
          })
          errorCount++
        }
      }

      setProgress(100)

      if (successCount > 0) {
        onUploadSuccess?.()
      }

      if (successCount > 0 && errorCount === 0) {
        setTimeout(() => {
          resetForm()
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setFileQueue([])
    setTitle('')
    setArtist('')
    setDefaultArtist('')
    setError(null)
    setProgress(0)
  }

  const handleUpload = async () => {
    if (uploadMethod === 'blob' || uploadMethod === 'supabase') {
      if (!file || !title || !artist) {
        setError('Please fill in all fields')
        return
      }

      try {
        setLoading(true)
        setError(null)
        setProgress(0)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', title)
        formData.append('artist', artist)

        const endpoint = uploadMethod === 'blob'
          ? '/api/tracks/upload-blob'
          : '/api/tracks/upload-supabase'

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        setProgress(100)
        setFile(null)
        setTitle('')
        setArtist('')
        setError(null)
        onUploadSuccess?.()
        setTimeout(() => onClose(), 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setLoading(false)
      }
    } else if (uploadMethod === 'google-drive') {
      if (!googleDriveUrl && !googleDriveFileId) {
        setError('Please enter a Google Drive URL or File ID')
        return
      }

      if (!title) {
        setError('Please enter a track title')
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/tracks/sync-google-drive', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: googleDriveUrl,
            fileId: googleDriveFileId,
            title,
            artist: artist || 'Unknown',
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to add file')
        }

        setGoogleDriveUrl('')
        setGoogleDriveFileId('')
        setTitle('')
        setArtist('')
        setError(null)
        onUploadSuccess?.()
        setTimeout(() => onClose(), 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add file')
      } finally {
        setLoading(false)
      }
    }
  }

  if (!isOpen) return null

  const pendingCount = fileQueue.filter((f) => f.status === 'pending').length
  const successCount = fileQueue.filter((f) => f.status === 'success').length
  const errorCount = fileQueue.filter((f) => f.status === 'error').length

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Add Audio Tracks</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Upload Method Tabs */}
        <div className="flex gap-2 mb-6">
          {(['blob', 'supabase', 'google-drive'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setUploadMethod(method)}
              className={`px-4 py-2 rounded-lg transition-colors ${uploadMethod === method
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
            >
              {method === 'blob' ? 'Vercel Blob' : method === 'supabase' ? 'Supabase' : 'Google Drive'}
            </button>
          ))}
        </div>

        {/* Upload Mode Toggle */}
        {uploadMethod !== 'google-drive' && (
          <div className="flex gap-4 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="uploadMode"
                checked={uploadMode === 'single'}
                onChange={() => setUploadMode('single')}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-foreground">Single File</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="uploadMode"
                checked={uploadMode === 'batch'}
                onChange={() => setUploadMode('batch')}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-foreground">Batch Upload</span>
            </label>
          </div>
        )}

        {/* File Upload Form */}
        {uploadMethod !== 'google-drive' ? (
          uploadMode === 'single' ? (
            <div className="space-y-4">
              {/* File Input */}
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <label htmlFor="file-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {file ? file.name : 'Click or drag audio file here'}
                  </p>
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Track Info */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Track Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter track title"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Artist Name
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Enter artist name"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Batch File Input */}
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <label htmlFor="multi-file-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {fileQueue.length > 0
                      ? `${fileQueue.length} files selected`
                      : 'Click or drag multiple audio files here'}
                  </p>
                </label>
                <input
                  id="multi-file-input"
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleMultiFileChange}
                  className="hidden"
                />
              </div>

              {/* Default Artist for Batch */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Default Artist Name (for all files)
                </label>
                <input
                  type="text"
                  value={defaultArtist}
                  onChange={(e) => {
                    setDefaultArtist(e.target.value)
                    updateAllArtists(e.target.value)
                  }}
                  placeholder="Enter artist name"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* File Queue */}
              {fileQueue.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
                  {fileQueue.map((item) => (
                    <div key={item.id} className="p-3 flex items-center gap-3">
                      <FileAudio className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateQueueItem(item.id, { title: e.target.value })}
                          placeholder="Track title"
                          className="w-full px-2 py-1 text-xs bg-input border border-border rounded text-foreground placeholder-muted-foreground mt-1"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'pending' && (
                          <span className="text-xs text-muted-foreground">Ready</span>
                        )}
                        {item.status === 'uploading' && (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        )}
                        {item.status === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {item.status === 'error' && (
                          <div className="text-xs text-destructive" title={item.error}>Error</div>
                        )}
                        {item.status === 'pending' && (
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {fileQueue.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {pendingCount} ready, {successCount} uploaded, {errorCount} failed
                </div>
              )}
            </div>
          )
        ) : (
          /* Google Drive Form */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Track Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter track title"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Artist Name (Optional)
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Enter artist name"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Google Drive File ID
              </label>
              <input
                type="text"
                value={googleDriveFileId}
                onChange={(e) => setGoogleDriveFileId(e.target.value)}
                placeholder="e.g., 1a2b3c4d5e6f7g8h9i0j"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find the file ID in the Google Drive link
              </p>
            </div>

            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>How to get File ID:</strong> Open the file in Google Drive, the URL will be drive.google.com/file/d/{'{'}FILE_ID{'}'}/view
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          {uploadMethod === 'google-drive' ? (
            <button
              onClick={handleUpload}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Track'}
            </button>
          ) : uploadMode === 'single' ? (
            <button
              onClick={handleUpload}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          ) : (
            <button
              onClick={handleBatchUpload}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={loading || fileQueue.length === 0}
            >
              {loading ? `Uploading ${successCount + errorCount}/${fileQueue.length}...` : `Upload ${fileQueue.length} Files`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
