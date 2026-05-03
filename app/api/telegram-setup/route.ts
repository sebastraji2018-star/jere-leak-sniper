import { NextResponse } from 'next/server'

export async function GET() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`)
    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.description }, { status: 400 })
    }

    const chats = new Map<string, { id: number; type: string; title?: string; username?: string }>()
    for (const update of data.result ?? []) {
      const msg = update.message ?? update.channel_post
      if (msg?.chat) {
        const c = msg.chat
        chats.set(String(c.id), {
          id: c.id,
          type: c.type,
          title: c.title,
          username: c.username
        })
      }
    }

    return NextResponse.json({
      currentChatId: process.env.TELEGRAM_CHAT_ID,
      chatsFound: Array.from(chats.values())
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
