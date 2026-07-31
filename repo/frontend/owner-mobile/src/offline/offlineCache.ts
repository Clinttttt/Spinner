import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "spinner-offline.db";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

interface CacheRow {
  payload: string;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME).then(
    async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS api_cache (
          cache_key TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          cached_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_api_cache_user
          ON api_cache(user_id);
      `);
      return database;
    },
  );
  return databasePromise;
}

export async function cacheApiResponse(
  cacheKey: string,
  userId: string,
  value: unknown,
) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO api_cache(cache_key, user_id, payload, cached_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       user_id = excluded.user_id,
       payload = excluded.payload,
       cached_at = excluded.cached_at`,
    cacheKey,
    userId,
    JSON.stringify(value),
    Date.now(),
  );
  await database.runAsync(
    "DELETE FROM api_cache WHERE cached_at < ?",
    Date.now() - RETENTION_MS,
  );
}

export async function readCachedApiResponse<T>(cacheKey: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<CacheRow>(
    "SELECT payload FROM api_cache WHERE cache_key = ?",
    cacheKey,
  );
  if (!row) return undefined;

  try {
    return JSON.parse(row.payload) as T;
  } catch {
    await database.runAsync(
      "DELETE FROM api_cache WHERE cache_key = ?",
      cacheKey,
    );
    return undefined;
  }
}

export interface OfflineCacheStatus {
  entryCount: number;
  lastUpdatedAt: number | null;
}

/**
 * Freshness of the local read cache, used to tell the owner how old the data on
 * screen is while offline. Cached rows are user-scoped and cleared on logout,
 * so the newest row belongs to the signed-in account.
 */
export async function getOfflineCacheStatus(
  userId?: string,
): Promise<OfflineCacheStatus> {
  const database = await getDatabase();
  const row = userId
    ? await database.getFirstAsync<{ count: number; latest: number | null }>(
        "SELECT COUNT(*) as count, MAX(cached_at) as latest FROM api_cache WHERE user_id = ?",
        userId,
      )
    : await database.getFirstAsync<{ count: number; latest: number | null }>(
        "SELECT COUNT(*) as count, MAX(cached_at) as latest FROM api_cache",
      );

  return {
    entryCount: row?.count ?? 0,
    lastUpdatedAt: row?.latest ?? null,
  };
}

export async function clearOfflineCache(userId?: string) {
  const database = await getDatabase();
  if (userId) {
    await database.runAsync("DELETE FROM api_cache WHERE user_id = ?", userId);
    return;
  }
  await database.runAsync("DELETE FROM api_cache");
}
