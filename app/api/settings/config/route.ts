import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin.from('system_config').select('*')
  const config: Record<string, string> = {}
  data?.forEach(row => { config[row.key] = row.value })
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json()
  const { error } = await supabaseAdmin
    .from('system_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
