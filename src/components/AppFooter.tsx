import React, { useRef, useState } from 'react'

export default function AppFooter() {
  // Рингтон — тот же файл, что и для уведомлений интервалов
  const ringtoneUrl = new URL('../../ringtone-022-376904.mp3', import.meta.url).href
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePreview = async () => {
    try {
      if (!audioRef.current) {
        const a = new Audio(ringtoneUrl)
        a.preload = 'auto'
        a.loop = false
        audioRef.current = a
      }
      const a = audioRef.current!
      // Перезапуск с начала
      a.pause()
      a.currentTime = 0
      setIsPlaying(true)
      await a.play()
      // Когда трек закончится — снять флаг
      const onEnded = () => {
        setIsPlaying(false)
        a.removeEventListener('ended', onEnded)
      }
      a.addEventListener('ended', onEnded)
    } catch {
      setIsPlaying(false)
    }
  }

  return (
    <footer className="mt-6 text-sm text-white/60 space-y-2">
      <p>
        myfocustracker.com — простой трекер фокуса, который помогает держать внимание людям с СДВГ и всем, кому сложно
        сосредоточиться. Сессии разбиты на 8 отрезков по 45 минут: такой формат часто считается самым универсальным и комфортным.
      </p>
      <p>
        Правила: запускать можно только ближайший незавершённый интервал; по окончании текущего следующий стартует автоматически;
        по завершении каждого интервала проигрывается короткий музыкальный сигнал
        {' '}
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPlaying}
          className={`underline underline-offset-2 text-white/80 hover:text-white focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
          aria-label="Прослушать звуковой сигнал"
        >
          (проиграть)
        </button>
        .
      </p>
      <p>
        Можно не переживать за перезагрузку страницы: текущее состояние прогресса автоматически сохраняется и восстанавливается при следующем открытии.
      </p>
    </footer>
  )
}
