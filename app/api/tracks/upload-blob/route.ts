import { NextRequest, NextResponse } from 'next/server'
import { uploadToBlob, saveTrackMetadata } from '@/lib/storage'

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

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'File must be an audio file',
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

    // Upload to Blob
    const { url, size } = await uploadToBlob(file, file.name)

    // Save metadata to Supabase
    const track = await saveTrackMetadata({
      title,
      artist,
      duration: 0, // Will be updated when audio metadata is read
      url,
      source: 'blob',
      size,
      mime_type: file.type,
    })

    return NextResponse.json({
      success: true,
      track,
    })
  } catch (error) {
    console.error('Error uploading to Blob:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    )
  }
}
