import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')

  let query = supabaseAdmin
    .from('detected_leaks')
    .select('*')
    .order('detected_at', { ascending: false })

  if (platform && platform !== 'all') {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const { id, managed } = await req.json()
  const { error } = await supabaseAdmin
    .from('detected_leaks')
    .update({ managed })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
