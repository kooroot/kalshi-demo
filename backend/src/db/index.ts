import { Database } from 'bun:sqlite'
import path from 'path'

const dbPath = path.join(import.meta.dir, '../../data/kalshi-personality.db')

export const db = new Database(dbPath, { create: true })

export function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      analysis_cache TEXT,
      updated_at INTEGER
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_profiles_api_key_id ON profiles(api_key_id)`)

  console.log('✅ Database initialized')
}

export interface Profile {
  id: string
  api_key_id: string
  created_at: number
  analysis_cache: string | null
  updated_at: number | null
}

export function getProfile(id: string): Profile | undefined {
  return db.query('SELECT * FROM profiles WHERE id = ?').get(id) as Profile | undefined
}

export function getProfileByApiKey(apiKeyId: string): Profile | undefined {
  return db.query('SELECT * FROM profiles WHERE api_key_id = ?').get(apiKeyId) as Profile | undefined
}

export function createProfile(id: string, apiKeyId: string): Profile {
  const now = Date.now()
  db.run('INSERT INTO profiles (id, api_key_id, created_at) VALUES (?, ?, ?)', [id, apiKeyId, now])
  return { id, api_key_id: apiKeyId, created_at: now, analysis_cache: null, updated_at: null }
}

export function updateProfileCache(id: string, cache: string): void {
  const now = Date.now()
  db.run('UPDATE profiles SET analysis_cache = ?, updated_at = ? WHERE id = ?', [cache, now, id])
}
