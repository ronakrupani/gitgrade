import { useEffect, useRef, useState } from "react"

/**
 * Reveals an element the first time it scrolls into view.
 *
 * Falls back to visible when IntersectionObserver is missing, which covers
 * jsdom in tests and any browser that would otherwise render the page as a
 * column of invisible sections.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin: "-60px" },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}
