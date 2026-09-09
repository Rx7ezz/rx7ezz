import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 500 })
  }

  const { id } = await params
  const rows = await sql`SELECT thumb_file_id FROM tracks WHERE id = ${id} LIMIT 1`
  const thumbFileId = rows[0]?.thumb_file_id as string | null | undefined
  if (!thumbFileId) {
    return NextResponse.json({ error: "No thumbnail" }, { status: 404 })
  }

  const fileRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${thumbFileId}`)
  const fileData = await fileRes.json()
  if (!fileData.ok) {
    return NextResponse.json({ error: "Could not resolve thumbnail" }, { status: 502 })
  }

  const upstream = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${fileData.result.file_path}`)
  const headers = new Headers()
  headers.set("Content-Type", "image/jpeg")
  headers.set("Cache-Control", "public, max-age=3600")
  return new NextResponse(upstream.body, { status: upstream.status, headers })
}
