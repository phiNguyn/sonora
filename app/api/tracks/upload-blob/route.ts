import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
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

    // Upload to Vercel Blob
    const filename = `${Date.now()}-${file.name}`
    const blob = await put(filename, file, {
      access: 'private',
      addRandomSuffix: true,
    })

    // Save metadata to Supabase
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tracks')
      .insert([
        {
          title,
          artist,
          url: blob.url,
          source: 'blob',
          file_path: blob.pathname,
          size: file.size,
          mime_type: file.type,
          duration: 0, // Duration will be calculated on client
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      track: data,
    })
  } catch (error) {
    console.error('Error uploading to Blob:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 }
    )
  }
}
