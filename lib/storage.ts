import { put } from '@vercel/blob'
import { createClient } from './supabase/server'

export type Track = {
  id: string
  title: string
  artist: string
  duration: number
  url: string
  source: 'blob' | 'supabase' | 'google_drive' | 'local'
  file_path?: string
  size?: number
  mime_type?: string
  created_at?: string
  updated_at?: string
}

// Upload to Vercel Blob
export async function uploadToBlob(
  file: File,
  filename: string
): Promise<{ url: string; size: number }> {
  try {
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    return {
      url: blob.url,
      size: file.size,
    }
  } catch (error) {
    console.error('Blob upload failed:', error)
    throw new Error('Failed to upload file to Blob storage')
  }
}

// Upload to Supabase Storage
export async function uploadToSupabaseStorage(
  file: File,
  filename: string
): Promise<{ url: string; path: string; size: number }> {
  const supabase = await createClient()
  const path = `audio/${Date.now()}-${filename}`

  const { error, data } = await supabase.storage
    .from('audio')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: publicData } = supabase.storage
    .from('audio')
    .getPublicUrl(path)

  return {
    url: publicData.publicUrl,
    path,
    size: file.size,
  }
}

// Save track metadata to database
export async function saveTrackMetadata(
  track: Omit<Track, 'id' | 'created_at' | 'updated_at'>
): Promise<Track> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tracks')
    .insert([track])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save track metadata: ${error.message}`)
  }

  return data
}

// Get all tracks
export async function getAllTracks(source?: string): Promise<Track[]> {
  const supabase = await createClient()

  let query = supabase.from('tracks').select('*').order('created_at', { ascending: false })

  if (source) {
    query = query.eq('source', source)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch tracks: ${error.message}`)
  }

  return data || []
}

// Delete track
export async function deleteTrack(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('tracks').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete track: ${error.message}`)
  }
}
