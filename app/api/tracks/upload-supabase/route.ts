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

    const supabase = await createClient()
    const filePath = `tracks/${Date.now()}-${file.name}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('audio-files')
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
          mime_type: file.type,
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
