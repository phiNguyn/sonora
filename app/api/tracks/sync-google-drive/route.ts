import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Parse Google Drive folder ID from URL
// Formats: 
// - https://drive.google.com/drive/folders/FOLDER_ID
// - https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
function extractFolderId(url: string): string {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (!match) {
    throw new Error('Invalid Google Drive folder URL')
  }
  return match[1]
}

// Create direct download link from Google Drive file ID
function createGoogleDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

// Simple parser for Google Drive folder listing
// This is a workaround approach - extracts MP3s from public folder
async function getMP3FilesFromDrive(folderId: string): Promise<Array<{ id: string; name: string }>> {
  // For public folders, we can use this approach:
  // This is a simplified version - in production, use Google Drive API
  const files: Array<{ id: string; name: string }> = []

  // Placeholder: In production, implement proper Google Drive API integration
  // For now, we'll just return empty array and let user add files manually
  // Real implementation would use: googleapis package and OAuth2

  return files
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { folderUrl, useDirectAccess } = body

    if (!folderUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Drive folder URL is required',
        },
        { status: 400 }
      )
    }

    try {
      extractFolderId(folderUrl)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Google Drive URL format',
        },
        { status: 400 }
      )
    }

    // For now, return instruction to user
    // Full implementation would fetch files from Drive
    if (useDirectAccess) {
      // Return sample Google Drive streamable URL pattern
      return NextResponse.json({
        success: true,
        message: 'Google Drive integration is ready. You can add direct Google Drive file URLs.',
        example: 'https://drive.google.com/uc?export=download&id=FILE_ID',
        instructions: [
          '1. Share the file publicly on Google Drive',
          '2. Copy the file ID from the share link',
          '3. Use the format: https://drive.google.com/uc?export=download&id=FILE_ID',
          '4. Add to player manually or via the upload modal',
        ],
        synced: [],
      })
    }

    // Check if we already have files from this drive folder
    const supabase = await createClient()
    const { data: existingTracks } = await supabase
      .from('tracks')
      .select('*')
      .eq('source', 'google_drive')

    return NextResponse.json({
      success: true,
      message: 'Google Drive folder connected',
      synced: existingTracks || [],
      total: existingTracks?.length || 0,
    })
  } catch (error) {
    console.error('Error syncing Google Drive:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync Google Drive',
      },
      { status: 500 }
    )
  }
}

// Endpoint to add manual Google Drive URL
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileUrl, title, artist, fileId } = body

    if (!fileUrl && !fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'File URL or File ID is required',
        },
        { status: 400 }
      )
    }

    const url = fileUrl || createGoogleDriveDownloadUrl(fileId)
    const trackTitle = title || `Google Drive Track`
    const trackArtist = artist || 'Unknown'

    const supabase = await createClient()
    const { data: track, error } = await supabase
      .from('tracks')
      .insert([
        {
          title: trackTitle,
          artist: trackArtist,
          duration: 0,
          url,
          source: 'google_drive',
          file_path: fileId || undefined,
          mime_type: 'audio/mpeg',
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      track,
    })
  } catch (error) {
    console.error('Error adding Google Drive file:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add file',
      },
      { status: 500 }
    )
  }
}
