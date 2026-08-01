import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const artist = formData.get('artist') as string

    if (!file || !title || !artist) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: file, title, artist',
        },
        { status: 400 }
      )
    }

    // Validate file type - check by extension since some formats have generic MIME types
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus', '.weba']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    const isAudioByExtension = audioExtensions.includes(fileExtension)
    const isAudioByMime = file.type.startsWith('audio/') || file.type === 'application/octet-stream'

    if (!isAudioByExtension && !isAudioByMime) {
      return NextResponse.json(
        {
          success: false,
          error: `File must be an audio file. Supported: ${audioExtensions.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const filePath = `tracks/${Date.now()}-${file.name}`
    const bucketName = 'audio-files'

    // List buckets to check if audio-files exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`)
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName)

    // Create bucket if it doesn't exist
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      })
      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`)
      }
    }

    // Convert file to bytes
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine correct MIME type
    let mimeType = file.type
    if (!mimeType || mimeType === 'application/octet-stream') {
      // Map file extensions to MIME types
      const mimeTypeMap: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.opus': 'audio/opus',
        '.weba': 'audio/webp',
      }
      mimeType = mimeTypeMap[fileExtension] || 'audio/mpeg'
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path)

    // Save metadata to Supabase
    const { data: trackData, error: trackError } = await supabase
      .from('tracks')
      .insert([
        {
          title,
          artist,
          url: publicData.publicUrl,
          source: 'supabase',
          file_path: uploadData.path,
          size: file.size,
          mime_type: mimeType,
          duration: 0,
        },
      ])
      .select()
      .single()

    if (trackError) throw trackError

    return NextResponse.json({
      success: true,
      track: trackData,
    })
  } catch (error) {
    console.error('Error uploading to Supabase:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 }
    )
  }
}
