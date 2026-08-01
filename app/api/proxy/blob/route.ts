import { get } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get('pathname')
    const blobUrl = request.nextUrl.searchParams.get('url')

    if (!pathname && !blobUrl) {
      return NextResponse.json(
        { success: false, error: 'pathname or url is required' },
        { status: 400 }
      )
    }

    const target = blobUrl ?? pathname!
    const range = request.headers.get('range')

    const result = await get(target, {
      access: 'private',
      headers: range ? { Range: range } : undefined,
    })

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Blob not found' },
        { status: 404 }
      )
    }

    if (result.statusCode !== 200 || !result.stream) {
      return NextResponse.json(
        { success: false, error: 'Blob not found or unavailable' },
        { status: result.statusCode === 304 ? 304 : 404 }
      )
    }

    const headers = new Headers()
    headers.set('Content-Type', result.blob.contentType || 'application/octet-stream')
    headers.set('Cache-Control', result.blob.cacheControl || 'public, max-age=3600')
    headers.set('Accept-Ranges', 'bytes')

    const contentRange = result.headers.get('content-range')
    const contentLength = result.headers.get('content-length')
    if (contentRange) headers.set('Content-Range', contentRange)
    if (contentLength) headers.set('Content-Length', contentLength)

    return new NextResponse(result.stream, {
      status: range ? 206 : 200,
      headers,
    })
  } catch (error) {
    console.error('Error proxying blob:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch blob',
      },
      { status: 500 }
    )
  }
}
