import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface StoredAlgorithm {
  id: string;
  name: string;
  source: string;
  createdAt: number;
  updatedAt: number;
}

interface StudioDB extends DBSchema {
  algorithms: {
    key: string;
    value: StoredAlgorithm;
    indexes: { "by-updated": number };
  };
}

const DB_NAME = "pseudocode-studio";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<StudioDB>> | null = null;

function getDb(): Promise<IDBPDatabase<StudioDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StudioDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("algorithms", { keyPath: "id" });
        store.createIndex("by-updated", "updatedAt");
      },
    });
  }
  return dbPromise;
}

export async function listAlgorithms(): Promise<StoredAlgorithm[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex("algorithms", "by-updated");
  return items.reverse();
}

export async function getAlgorithm(id: string): Promise<StoredAlgorithm | undefined> {
  const db = await getDb();
  return db.get("algorithms", id);
}

export async function saveAlgorithm(algorithm: StoredAlgorithm): Promise<void> {
  const db = await getDb();
  await db.put("algorithms", algorithm);
}

export async function deleteAlgorithm(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("algorithms", id);
}

export function createAlgorithmId(): string {
  return crypto.randomUUID();
}
