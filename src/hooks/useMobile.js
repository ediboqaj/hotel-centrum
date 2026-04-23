import { useEffect, useState } from 'react'

const BREAKPOINT = 900  // below this = mobile layout

export function useMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < BREAKPOINT : false
  )

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < BREAKPOINT)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isMobile
}