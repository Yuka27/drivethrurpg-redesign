import { useEffect, useState } from 'react'

/** `value`, once it has stopped changing for `delay` ms (typing → one request). */
export function useDebouncedValue<T>(value: T, delay = 200) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}
