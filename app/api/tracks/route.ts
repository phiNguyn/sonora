import { NextRequest, NextResponse } from 'next/server'
import { getAllTracks } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const source = searchParams.get('source')

    const tracks = await getAllTracks(source || undefined)

    return NextResponse.json({
      success: true,
      tracks,
    })
  } catch (error) {
    console.error('Error fetching tracks:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tracks',
      },
      { status: 500 }
    )
  }
}
