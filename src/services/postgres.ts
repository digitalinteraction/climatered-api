import pg = require('pg')
import fs = require('fs')

export interface PoolClient {
  release(): void
  sql<T>(strings: TemplateStringsArray, ...args: any[]): Promise<T[]>
}

/**
 * A client for connecting to and querying a postgres database
 */
export interface PostgresService {
  run<T>(block: (c: PoolClient) => Promise<T>): Promise<T>
  client(): Promise<PoolClient>
  close(): Promise<void>
}

/** Create a custom pool client with a template-tag function to run queries */
async function makeClient(pool: pg.Pool): Promise<PoolClient> {
  const client = await pool.connect()

  return {
    release: () => client.release(),
    sql: async (strings, ...values) => {
      const query: string[] = []

      for (let i = 0; i < strings.length; i++) {
        query.push(strings[i])

        if (values[i]) {
          query.push(`$${i + 1}`)
        }
      }

      const text = query.join('')
      const results = await client.query(text, values)
      return results.rows
    },
  }
}

export function createPostgresService(
  sqlUrl: string,
  caPath?: string
): PostgresService {
  const opts: pg.PoolConfig = {
    connectionString: sqlUrl,
  }

  if (caPath) {
    opts.ssl = { ca: fs.readFileSync(caPath, 'utf8') }
  }

  const pool = new pg.Pool(opts)

  return {
    client: () => makeClient(pool),
    close: () => pool.end(),
    run: async (block) => {
      let client: PoolClient | undefined

      try {
        client = await makeClient(pool)

        // Run their block with the client
        const result = await block(client)
        return result
      } catch (error) {
        throw error
      } finally {
        client?.release()
      }
    },
  }
}
