'use client'

import { useState } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: () => void
}

export function AudioUploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [uploadMethod, setUploadMethod] = useState<'blob' | 'supabase' | 'google-drive'>('blob')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [googleDriveUrl, setGoogleDriveUrl] = useState('')
  const [googleDriveFileId, setGoogleDriveFileId] = useState('')

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
      // Extract title from filename
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
    }
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Add Audio Track</h2>
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
              className={`px-4 py-2 rounded-lg transition-colors ${
                uploadMethod === method
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {method === 'blob' ? 'Vercel Blob' : method === 'supabase' ? 'Supabase' : 'Google Drive'}
            </button>
          ))}
        </div>

        {/* File Upload Form */}
        {uploadMethod !== 'google-drive' ? (
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

            {/* Progress Bar */}
            {progress > 0 && (
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
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

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
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
          <button
            onClick={handleUpload}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
