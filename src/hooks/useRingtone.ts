import { useEffect, useMemo, useRef } from 'react'

export function useRingtone(items: { status: 'pending' | 'running' | 'paused' | 'done' }[], ringtoneUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const unlockedRef = useRef(false)
  const prevDoneRef = useRef(0)
  const initializedRef = useRef(false)

  // Prepare audio element
  useEffect(() => {
    const audio = new Audio(ringtoneUrl)
    audio.preload = 'auto'
    audio.loop = false
    audioRef.current = audio
    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [ringtoneUrl])

  const doneCount = useMemo(() => items.filter((x) => x.status === 'done').length, [items])

  // Play on increment of doneCount, suppress first run (hydration/initial mount)
  useEffect(() => {
    if (!initializedRef.current) {
      prevDoneRef.current = doneCount
      initializedRef.current = true
      return
    }
    if (doneCount > prevDoneRef.current) {
      const a = audioRef.current
      if (a) {
        try {
          a.currentTime = 0
          a.volume = 1
          a.play().catch(() => {})
        } catch {}
      }
    }
    prevDoneRef.current = doneCount
  }, [doneCount])

  const unlock = () => {
    if (unlockedRef.current) return
    const a = audioRef.current
    if (!a) {
      unlockedRef.current = true
      return
    }
    const prevVol = a.volume
    a.volume = 0
    a.play()
      .then(() => {
        a.pause()
        a.currentTime = 0
        a.volume = prevVol
        unlockedRef.current = true
      })
      .catch(() => {
        // ignore autoplay errors
      })
  }

  const reset = () => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    prevDoneRef.current = 0
    initializedRef.current = false
  }

  return { unlock, reset }
}
