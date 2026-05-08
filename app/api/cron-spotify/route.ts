import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scanSpotify } from '@/lib/scanner/spotify'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  const { data: keywords } = await supabaseAdmin
    .from('keywords')
    .select('term')
    .eq('active', true)

  const terms = keywords?.map(k => k.term) ?? []
  const result = await scanSpotify(terms)

  return NextResponse.json({ ok: true, ...result })
}
