import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN

type TgAudio = {
  file_id: string
  file_unique_id: string
  duration?: number
  title?: string
  performer?: string
  file_name?: string
  thumbnail?: { file_id: string }
}

type TgMessage = {
  message_id: number
  audio?: TgAudio
  caption?: string
}

type TgUpdate = {
  update_id: number
  channel_post?: TgMessage
  message?: TgMessage
}

export async function POST() {
  if (!TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 500 })
  }

  let offset = 0
  let added = 0
  let scanned = 0

  // Telegram delivers updates in batches; keep pulling until drained.
  for (let i = 0; i < 20; i++) {
    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${offset}&limit=100&timeout=0&allowed_updates=["channel_post","message"]`,
    )
    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.description || "Telegram error" }, { status: 502 })
    }

    const updates: TgUpdate[] = data.result
    if (updates.length === 0) break

    for (const update of updates) {
      offset = update.update_id + 1
      const msg = update.channel_post || update.message
      const audio = msg?.audio
      if (!audio) continue
      scanned++

      const rawTitle = audio.title || audio.file_name?.replace(/\.[^.]+$/, "") || "Без названия"
      const rawArtist = audio.performer || "Неизвестный артист"

      const result = await sql`
        INSERT INTO tracks (file_id, file_unique_id, title, artist, duration, thumb_file_id, message_id)
        VALUES (
          ${audio.file_id},
          ${audio.file_unique_id},
          ${rawTitle},
          ${rawArtist},
          ${audio.duration ?? 0},
          ${audio.thumbnail?.file_id ?? null},
          ${msg?.message_id ?? null}
        )
        ON CONFLICT (file_id) DO NOTHING
        RETURNING id
      `
      if (result.length > 0) added++
    }
  }

  return NextResponse.json({ ok: true, added, scanned })
}
