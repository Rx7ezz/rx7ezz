import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await sql`
    SELECT id, title, artist, duration, thumb_file_id, created_at
    FROM tracks
    ORDER BY created_at DESC
  `
  return NextResponse.json({ tracks: rows })
}
