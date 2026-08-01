import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'File ID is required',
        },
        { status: 400 }
      )
    }

    // Construct Google Drive download URL
    const googleDriveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`

    // Fetch the file from Google Drive
    const response = await fetch(googleDriveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Google Drive returned status ${response.status}`)
    }

    // Get the file content
    const arrayBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'audio/mpeg'

    // Return with CORS headers
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
    headers.set('Cache-Control', 'public, max-age=3600')

    return new NextResponse(arrayBuffer, {
      headers,
    })
  } catch (error) {
    console.error('Error proxying Google Drive file:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch file from Google Drive',
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
