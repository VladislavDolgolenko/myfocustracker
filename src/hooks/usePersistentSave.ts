import { useEffect, useRef } from 'react'
import { PersistedItem, saveState } from '../storage'

// Throttled persistence: saves at most once per "intervalMs" while items are changing.
// Also exposes an immediate saver and performs a final flush on page hide / unload and on cleanup.
export function usePersistentSave(items: PersistedItem[], intervalMs = 1000, enabled = true) {
  const itemsRef = useRef<PersistedItem[]>(items)
  const timerRef = useRef<number | null>(null)

  // keep latest items snapshot and throttle saves
  useEffect(() => {
    itemsRef.current = items
    if (!enabled) return
    if (timerRef.current == null) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        const snapshot = itemsRef.current
        const runningIndex = snapshot.findIndex((it) => it.status === 'running')
        saveState(snapshot.map((it) => ({ status: it.status, elapsedMs: it.elapsedMs })), runningIndex)
      }, intervalMs)
    }
  }, [items, intervalMs, enabled])

  useEffect(() => {
    if (!enabled) return

    const flush = () => {
      const snapshot = itemsRef.current
      const runningIndex = snapshot.findIndex((it) => it.status === 'running')
      saveState(snapshot.map((it) => ({ status: it.status, elapsedMs: it.elapsedMs })), runningIndex)
    }

    const handleBeforeUnload = () => flush()
    const handlePageHide = () => flush()
    const handleVisibilityChange = () => {
      if (document.hidden) flush()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // final synchronous flush on cleanup
      flush()
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled])

  const saveNow = (snapshot?: PersistedItem[]) => {
    const snap = snapshot ?? itemsRef.current
    const runningIndex = snap.findIndex((it) => it.status === 'running')
    saveState(snap.map((it) => ({ status: it.status, elapsedMs: it.elapsedMs })), runningIndex)
  }

  return { saveNow }
}
