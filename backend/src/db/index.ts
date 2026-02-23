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

  // Migration: add username column if missing (for existing DBs)
  try {
    db.run(`ALTER TABLE profiles ADD COLUMN username TEXT`)
  } catch {
    // Column already exists
  }

  db.run(`CREATE INDEX IF NOT EXISTS idx_profiles_api_key_id ON profiles(api_key_id)`)
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username)`)

  console.log('Database initialized')
}

export interface Profile {
  id: string
  api_key_id: string
  created_at: number
  analysis_cache: string | null
  updated_at: number | null
  username: string | null
}

export function getProfile(id: string): Profile | undefined {
  return db.query('SELECT * FROM profiles WHERE id = ?').get(id) as Profile | undefined
}

export function getProfileByApiKey(apiKeyId: string): Profile | undefined {
  return db.query('SELECT * FROM profiles WHERE api_key_id = ?').get(apiKeyId) as Profile | undefined
}

export function getProfileByUsername(username: string): Profile | undefined {
  return db.query('SELECT * FROM profiles WHERE username = ? COLLATE NOCASE').get(username) as Profile | undefined
}

export function createProfile(id: string, apiKeyId: string, username?: string): Profile {
  const now = Date.now()
  db.run('INSERT INTO profiles (id, api_key_id, created_at, username) VALUES (?, ?, ?, ?)', [id, apiKeyId, now, username || null])
  return { id, api_key_id: apiKeyId, created_at: now, analysis_cache: null, updated_at: null, username: username || null }
}

export function updateProfileCache(id: string, cache: string): void {
  const now = Date.now()
  db.run('UPDATE profiles SET analysis_cache = ?, updated_at = ? WHERE id = ?', [cache, now, id])
}

export function updateProfileUsername(id: string, username: string): void {
  db.run('UPDATE profiles SET username = ? WHERE id = ?', [username, id])
}

export function searchProfiles(query: string): Profile[] {
  // Exact match first
  const exact = db.query('SELECT * FROM profiles WHERE username = ? COLLATE NOCASE AND analysis_cache IS NOT NULL').get(query) as Profile | undefined
  if (exact) return [exact]

  // Partial match
  const results = db.query('SELECT * FROM profiles WHERE username LIKE ? COLLATE NOCASE AND analysis_cache IS NOT NULL LIMIT 5').all(`%${query}%`) as Profile[]
  return results
}
