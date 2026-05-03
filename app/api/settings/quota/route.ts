import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabaseAdmin
    .from('youtube_quota')
    .select('units_used')
    .eq('date', today)
    .single()
  return NextResponse.json({ units_used: data?.units_used ?? 0 })
}
