/**
 * useProductCache — IndexedDB cache for Omie product list.
 *
 * On mount:
 *   1. Loads products instantly from IndexedDB if available.
 *   2. Checks if cache is still fresh (TTL = 15 min).
 *   3. If stale or empty, fetches from the server and updates IndexedDB.
 *
 * refresh(forceReload=false):
 *   - forceReload=true  → clears IndexedDB and re-fetches (Botão Atualizar)
 *   - forceReload=false → re-validates TTL as usual
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const DB_NAME = 'escamax-cache';
const DB_VERSION = 1;
const STORE_NAME = 'products';
const META_STORE = 'meta';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ── IndexedDB helpers ──────────────────────────────────────────────────────────

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'codigo' });
            }
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function readAllFromDB(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function writeAllToDB(db, items) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const meta = tx.objectStore(META_STORE);
        // Clear old data
        store.clear();
        // Write all products
        for (const item of items) {
            store.put(item);
        }
        // Write timestamp
        meta.put(Date.now(), 'lastFetch');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getLastFetch(db) {
    return new Promise((resolve) => {
        const tx = db.transaction(META_STORE, 'readonly');
        const store = tx.objectStore(META_STORE);
        const req = store.get('lastFetch');
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
    });
}

async function clearDB(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.objectStore(META_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * syncStatus values:
 *   'idle'     - not yet started
 *   'cache'    - showing data from IndexedDB cache
 *   'syncing'  - fetching fresh data from server (cache may already be shown)
 *   'done'     - fresh data loaded and shown
 *   'error'    - fetch failed
 */
export function useProductCache() {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);     // true = no data yet (first paint)
    const [syncStatus, setSyncStatus] = useState('idle');
    const [syncProgress, setSyncProgress] = useState({ loaded: 0, total: 0 });
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null); // timestamp da última atualização

    const dbRef = useRef(null);
    const lastRefreshRef = useRef(0); // timestamp of last refresh attempt

    // Opens DB once
    const getDB = useCallback(async () => {
        if (!dbRef.current) {
            dbRef.current = await openDB();
        }
        return dbRef.current;
    }, []);

    const fetchFromServer = useCallback(async (db) => {
        setSyncStatus('syncing');
        setSyncProgress({ loaded: 0, total: 0 });
        setError(null);

        const token = localStorage.getItem('token');
        const res = await fetch('/api/parts/listar', {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.details || errData.error || `Erro ${res.status}`);
        }

        const data = await res.json();
        setSyncProgress({ loaded: data.length, total: data.length });

        // Persist to IndexedDB
        await writeAllToDB(db, data);

        return data;
    }, []);

    /**
     * Main load function.
     * @param {boolean} forceReload - if true, clears cache and re-fetches unconditionally
     */
    const load = useCallback(async (forceReload = false) => {
        setError(null);
        try {
            const db = await getDB();

            if (forceReload) {
                await clearDB(db);
            }

            // 1. Try to serve from cache first
            const cached = await readAllFromDB(db);
            const lastFetch = await getLastFetch(db);
            const isFresh = Date.now() - lastFetch < CACHE_TTL_MS;

            if (cached.length > 0) {
                // Show cached data immediately
                setParts(cached);
                setLoading(false);
                setSyncStatus('cache');
                if (lastFetch) setLastUpdate(new Date(lastFetch));
            }

            // 2. If stale, missing, or forced — fetch from server
            if (forceReload || cached.length === 0 || !isFresh) {
                if (cached.length === 0) {
                    // No data yet — keep loading spinner
                    setLoading(true);
                }
                const fresh = await fetchFromServer(db);
                setParts(fresh);
                setLoading(false);
                setSyncStatus('done');
                setLastUpdate(new Date());
            } else {
                setSyncStatus('done');
            }
        } catch (err) {
            setError(`Não foi possível carregar o estoque: ${err.message}`);
            // Mantém os produtos já exibidos (não vai para tela em branco)
            setLoading(false);
            setSyncStatus('error');
        }
    }, [getDB, fetchFromServer]);

    // Initial load on mount
    useEffect(() => {
        load(false);
    }, [load]);

    // Exposed refresh function (called by Botão Atualizar) — 30s cooldown
    const refresh = useCallback(() => {
        const now = Date.now();
        const COOLDOWN_MS = 30_000;
        if (now - lastRefreshRef.current < COOLDOWN_MS) {
            console.info(`[Cache] Aguarde ${Math.ceil((COOLDOWN_MS - (now - lastRefreshRef.current)) / 1000)}s antes de atualizar novamente.`);
            return;
        }
        lastRefreshRef.current = now;
        load(true);
    }, [load]);

    return { parts, loading, syncStatus, syncProgress, error, refresh, lastUpdate };
}
