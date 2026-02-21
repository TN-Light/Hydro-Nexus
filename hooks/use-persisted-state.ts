"use client"

import { useState, useEffect, useCallback, useRef } from "react"

/**
 * A drop-in replacement for useState that persists values to localStorage.
 * Survives page refreshes and tab closes. Syncs across tabs via storage event.
 *
 * @param key  Unique localStorage key (prefix with page name, e.g. "dt:selectedBag")
 * @param defaultValue  Fallback when nothing is stored yet
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Lazy initializer reads from localStorage only once
  const [state, setStateRaw] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        return JSON.parse(stored) as T
      }
    } catch {
      // corrupted value — fall through
    }
    return defaultValue
  })

  // Keep a ref so the storage listener can access latest state
  const stateRef = useRef(state)
  stateRef.current = state

  // Persist on change
  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // quota exceeded — ignore
        }
        return next
      })
    },
    [key]
  )

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue) as T
          setStateRaw(parsed)
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [key])

  return [state, setState]
}
