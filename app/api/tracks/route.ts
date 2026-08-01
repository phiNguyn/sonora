import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const source = searchParams.get('source')

    const supabase = await createClient()
    let query = supabase.from('tracks').select('*').order('created_at', {
      ascending: false,
    })

    if (source) {
      query = query.eq('source', source)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      tracks: data || [],
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
