import { useEffect, useState } from 'react'

export function useCounter(end: number, active: boolean, duration = 2000) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = end / (duration / 16)
    const id = setInterval(() => {
      start += step
      if (start >= end) { setVal(end); clearInterval(id) }
      else setVal(Math.floor(start))
    }, 16)
    return () => clearInterval(id)
  }, [active, end, duration])
  return val
}
