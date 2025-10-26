import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import IntervalRow from "./components/IntervalRow";
import AppFooter from "./components/AppFooter";
import { loadState, clearState } from "./storage";
import { useRingtone } from "./hooks/useRingtone";
import { usePersistentSave } from "./hooks/usePersistentSave";

// Путь к рингтону (через new URL, чтобы избежать TS-деклараций для mp3)
const ringtoneUrl = new URL("../ringtone-022-376904.mp3", import.meta.url).href;

// 8 интервалов по 45 минут (в миллисекундах)
const INTERVAL_COUNT = 8;
const INTERVAL_MS = 45 * 60 * 1000; // 2700000

// Статусы интервалов
type IntervalStatus = "pending" | "running" | "paused" | "done";

interface IntervalItem {
  status: IntervalStatus;
  // накопленное время (мс), когда интервал не бежит
  elapsedMs: number;
}

function formatTime(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function FocusIntervals() {
  const [items, setItems] = useState<IntervalItem[]>(
    Array.from({ length: INTERVAL_COUNT }, () => ({ status: "pending", elapsedMs: 0 }))
  );

  // Индекс текущего исполняемого интервала (если есть)
  const runningIndex = items.findIndex((it) => it.status === "running");

  // Первый незавершённый (pending|paused|running). Именно он может быть запущен.
  const firstActiveIndex = useMemo(() => items.findIndex((it) => it.status !== "done"), [items]);

  // Для точного тика сохраняем момент старта текущего запуска
  const startTsRef = useRef<number | null>(null);

  // Хуки: звук уведомления и сохранение состояния
  const [hydrated, setHydrated] = useState(false);
  const { unlock, reset: resetAudio } = useRingtone(items, ringtoneUrl);
  const { saveNow } = usePersistentSave(items, 1000, hydrated);


  // Гидрация состояния из localStorage (восстановление прогресса и статуса)
  useEffect(() => {
    const saved = loadState(INTERVAL_COUNT);
    if (!saved) return;
    const now = Date.now();
    const restored = saved.items.map((it) => ({ status: it.status as IntervalStatus, elapsedMs: it.elapsedMs as number }));
    let idx = saved.runningIndex;
    if (idx < 0) {
      const found = restored.findIndex((it) => it.status === 'running')
      idx = found
    }
    let delta = Math.max(0, now - saved.savedAt);
    // последовательно «догоняем» прошедшее время, возможно переходя через несколько интервалов
    while (idx >= 0 && delta > 0) {
      const cur = restored[idx];
      if (!cur || cur.status !== 'running') break;
      const remaining = INTERVAL_MS - cur.elapsedMs;
      if (delta >= remaining) {
        // завершаем текущий и переходим к следующему
        restored[idx] = { status: 'done', elapsedMs: INTERVAL_MS };
        delta -= remaining;
        const nextIdx = idx + 1;
        if (nextIdx < restored.length) {
          restored[nextIdx] = { ...restored[nextIdx], status: 'running' };
          idx = nextIdx;
        } else {
          idx = -1;
          break;
        }
      } else {
        restored[idx] = { ...cur, elapsedMs: cur.elapsedMs + delta };
        delta = 0;
      }
    }
    setItems(restored);
    startTsRef.current = idx >= 0 ? now : null;
    setHydrated(true);
    // Немедленно зафиксируем восстановленное состояние, чтобы обновить savedAt
    saveNow(restored as any);
  }, []);

  // При возвращении во вкладку наверстываем прогресс, прошедший в фоне
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return;
      const saved = loadState(INTERVAL_COUNT);
      if (!saved) return;

      const now = Date.now();
      const restored = saved.items.map((it) => ({ status: it.status as IntervalStatus, elapsedMs: it.elapsedMs as number }));
      let idx = saved.runningIndex;
      if (idx < 0) {
        const found = restored.findIndex((it) => it.status === 'running');
        idx = found;
      }

      let delta = Math.max(0, now - saved.savedAt);
      while (idx >= 0 && delta > 0) {
        const cur = restored[idx];
        if (!cur || cur.status !== 'running') break;
        const remaining = INTERVAL_MS - cur.elapsedMs;
        if (delta >= remaining) {
          restored[idx] = { status: 'done', elapsedMs: INTERVAL_MS };
          delta -= remaining;
          const nextIdx = idx + 1;
          if (nextIdx < restored.length) {
            restored[nextIdx] = { ...restored[nextIdx], status: 'running' };
            idx = nextIdx;
          } else {
            idx = -1;
            break;
          }
        } else {
          restored[idx] = { ...cur, elapsedMs: cur.elapsedMs + delta };
          delta = 0;
        }
      }

      setItems(restored);
      startTsRef.current = idx >= 0 ? now : null;
      // Зафиксируем состояние сразу после «догонки», чтобы обновить savedAt
      saveNow(restored as any);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);


  // При первом переводе в running ставим стартовую метку времени
  useEffect(() => {
    if (runningIndex >= 0 && startTsRef.current == null) {
      startTsRef.current = Date.now();
    }
    if (runningIndex === -1) {
      startTsRef.current = null;
    }
  }, [runningIndex]);

  // Тик таймера: обновляем elapsed у текущего running
  useEffect(() => {
    if (runningIndex === -1) return;

    let raf = 0;
    const tick = () => {
      if (runningIndex === -1 || startTsRef.current == null) return;

      const now = Date.now();
      const delta = now - startTsRef.current; // прошедшее с запуска

      setItems((prev) => {
        const next = [...prev];
        const cur = next[runningIndex];
        if (!cur) return prev;

        const elapsedNow = cur.elapsedMs + delta;
        const remaining = INTERVAL_MS - elapsedNow;

        if (remaining <= 0) {
          // Завершаем текущий
          next[runningIndex] = { status: "done", elapsedMs: INTERVAL_MS };
          // Готовим автопереход на следующий, если он есть
          const nextIdx = runningIndex + 1;
          if (nextIdx < next.length) {
            // автозапуск следующего по порядку
            next[nextIdx] = { ...next[nextIdx], status: "running" };
            // сбрасываем базовую метку, так как ставим новый старт
            startTsRef.current = Date.now();
          } else {
            // всё завершено
            startTsRef.current = null;
          }
          // Немедленно сохраним завершение/переход
          saveNow(next as any);
          return next;
        }

        // Ещё не завершён — обновим только визуальную часть через ref; фактический elapsed запишем плавно
        // Обновляем elapsed у running так, чтобы не копить дельту (перезапускаем базу)
        next[runningIndex] = { ...cur, elapsedMs: elapsedNow };
        // Перезапускаем базовую метку на текущее «сейчас», чтобы delta считалась с нуля
        startTsRef.current = now;
        return next;
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runningIndex]);


  const startInterval = (index: number) => {
    // Разрешаем запускать только первый незавершённый
    if (index !== firstActiveIndex) return;

      // Разблокируем воспроизведение звука на первый пользовательский клик
    unlock();

    setItems((prev) => {
      const next = prev.map((it, i) => ({ ...it }));

      // Если кто-то бежит — стопнем его (на всякий случай, но по логике бежит только firstActiveIndex)
      const curRunning = next.findIndex((it) => it.status === "running");
      if (curRunning >= 0) {
        // При остановке через автосмену мы уже обновили elapsed в тике, здесь только статус
        next[curRunning].status = "paused";
      }

      next[index].status = "running";
      // Сбросим базовую метку старта
      startTsRef.current = Date.now();
      return next;
    });
  };

  const stopInterval = (index: number) => {
    // Можно стопать только если он реально бежит
    if (items[index]?.status !== "running") return;

    setItems((prev) => {
      const next = prev.map((it) => ({ ...it }));
      // elapsed уже увеличен последним тиковым апдейтом; фиксируем статус
      next[index].status = "paused";
      // Остановить общее измерение
      startTsRef.current = null;
      // Немедленно сохраним состояние
      saveNow(next as any);
      return next;
    });
  };

  const resetAll = () => {
    const cleared = Array.from({ length: INTERVAL_COUNT }, () => ({ status: "pending" as IntervalStatus, elapsedMs: 0 }))
    setItems(cleared);
    startTsRef.current = null;
    // Остановим возможное проигрывание
    resetAudio();
    // Очистим сохранённое состояние и немедленно сохраним пустое
    clearState();
    saveNow(cleared as any);
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-3xl mx-auto mb-2 text-center text-xs text-xl text-white/70">My Focus Tracker .com</div>
      <div className="max-w-3xl mx-auto backdrop-blur-md bg-white/10 rounded-3xl shadow-xl p-3 md:p-8 md:border md:border-white/20">
        <Header onReset={resetAll} />

        <ul className="space-y-4">
          {items.map((it, i) => {
            const isCurrent = i === firstActiveIndex && it.status !== "done";
            const isRunning = it.status === "running";

            // Расчёты оставшегося/прогресса
            const remainingMs = Math.max(0, INTERVAL_MS - it.elapsedMs);
            const total = INTERVAL_MS;
            const progress = Math.min(100, Math.round((it.elapsedMs / total) * 100));

            return (
              <IntervalRow
                key={i}
                index={i}
                status={it.status}
                progress={progress}
                remainingLabel={it.status === "done" ? "00:00" : formatTime(remainingMs)}
                isCurrent={isCurrent}
                isRunning={isRunning}
                onStart={() => startInterval(i)}
                onStop={() => stopInterval(i)}
              />
            );
          })}
        </ul>

        <AppFooter />
      </div>
    </div>
  );
}
