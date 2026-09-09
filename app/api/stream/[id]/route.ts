import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function resolveFileUrl(fileId: string) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`)
  const data = await res.json()
  if (!data.ok) return null
  return `https://api.telegram.org/file/bot${TOKEN}/${data.result.file_path}`
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 500 })
  }

  const { id } = await params
  const rows = await sql`SELECT file_id FROM tracks WHERE id = ${id} LIMIT 1`
  if (rows.length === 0) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 })
  }

  const fileUrl = await resolveFileUrl(rows[0].file_id as string)
  if (!fileUrl) {
    return NextResponse.json({ error: "Could not resolve file" }, { status: 502 })
  }

  // Forward the Range header so the browser can seek within the audio.
  const range = request.headers.get("range")
  const upstream = await fetch(fileUrl, {
    headers: range ? { Range: range } : {},
  })

  const headers = new Headers()
  headers.set("Content-Type", "audio/mpeg")
  headers.set("Accept-Ranges", "bytes")
  const len = upstream.headers.get("content-length")
  if (len) headers.set("Content-Length", len)
  const contentRange = upstream.headers.get("content-range")
  if (contentRange) headers.set("Content-Range", contentRange)
  headers.set("Cache-Control", "no-store")

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
}
