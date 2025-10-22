export type PersistedItem = { status: 'pending' | 'running' | 'paused' | 'done'; elapsedMs: number }
export type PersistedStateV1 = {
  version: 1
  items: PersistedItem[]
  runningIndex: number
  savedAt: number
}

const KEY = 'focus-intervals:v1'

export function saveState(items: PersistedItem[], runningIndex: number) {
  try {
    const data: PersistedStateV1 = {
      version: 1,
      items,
      runningIndex,
      savedAt: Date.now(),
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function loadState(expectedCount: number): PersistedStateV1 | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedStateV1
    if (!parsed || parsed.version !== 1) return null
    if (!Array.isArray(parsed.items) || parsed.items.length !== expectedCount) return null
    if (typeof parsed.runningIndex !== 'number' || typeof parsed.savedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
