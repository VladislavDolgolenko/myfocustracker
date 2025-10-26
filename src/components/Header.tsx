import React from 'react'

interface HeaderProps {
  onReset: () => void
}

export default function Header({ onReset }: HeaderProps) {
  return (
    <header className="mb-6 md:mb-8 flex items-center justify-between">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">My Focus Tracker .com</h1>
      <button
        onClick={onReset}
        className="px-4 py-2 rounded-xl text-sm font-medium bg-white/20 hover:bg-white/30 text-white border border-white/30 shadow-sm transition-colors"
      >
        Сбросить
      </button>
    </header>
  )
}
