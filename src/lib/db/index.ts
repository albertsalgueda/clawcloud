import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type Database = ReturnType<typeof drizzle<typeof schema>>

let _db: Database | null = null

function getDb(): Database {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set')
    }
    const client = postgres(connectionString, { prepare: false })
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy({} as Database, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
