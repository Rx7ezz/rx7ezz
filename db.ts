import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

export const sql = neon(process.env.DATABASE_URL)

export type Track = {
  id: number
  file_id: string
  title: string
  artist: string
  duration: number
  thumb_file_id: string | null
  created_at: string
}
