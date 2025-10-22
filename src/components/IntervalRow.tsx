import React from 'react'

interface IntervalRowProps {
  index: number
  status: 'pending' | 'running' | 'paused' | 'done'
  progress: number
  remainingLabel: string
  isCurrent: boolean
  isRunning: boolean
  onStart: () => void
  onStop: () => void
}

export default function IntervalRow({
  index,
  status,
  progress,
  remainingLabel,
  isCurrent,
  isRunning,
  onStart,
  onStop
}: IntervalRowProps) {
  return (
    <li className="rounded-2xl p-4 bg-white/10 backdrop-blur border border-white/20 shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/70">#{index + 1}</span>
          <span
            className={
              'text-xs px-2 py-1 rounded-full border ' +
              (status === 'done'
                ? 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30'
                : status === 'running'
                ? 'bg-cyan-400/20 text-cyan-200 border-cyan-300/30'
                : status === 'paused'
                ? 'bg-amber-400/20 text-amber-200 border-amber-300/30'
                : 'bg-white/10 text-white/70 border-white/20')
            }
          >
            {status === 'pending' ? 'ожидает' : status === 'running' ? 'идёт' : status === 'paused' ? 'пауза' : 'готово'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status !== 'done' && !isRunning && (
            <button
              onClick={onStart}
              disabled={!isCurrent}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                isCurrent
                  ? 'bg-white/20 hover:bg-white/30 text-white border-white/30'
                  : 'bg-white/10 text-white/40 cursor-not-allowed border-white/10'
              }`}
            >
              Start
            </button>
          )}
          {isRunning && (
            <button
              onClick={onStop}
              className="px-3 py-1.5 rounded-xl text-sm font-medium bg-rose-500/80 hover:bg-rose-500 text-white"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${progress}%`, transition: 'width 0.2s linear' }} />
      </div>

      <div className="text-sm text-white/80 flex items-center justify-between">
        <span>Прогресс: {progress}%</span>
        <span>Осталось: {remainingLabel}</span>
      </div>
    </li>
  )
}
