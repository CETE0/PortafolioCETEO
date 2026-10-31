import { useEffect } from 'react'

/** Crosshair cursor: rotates on click, turns red over interactive elements and dark [data-cursor="red"] areas. */
export default function CustomCursor() {
  useEffect(() => {
    const cursor = document.createElement('div')
    cursor.className = 'custom-cursor'
    const crosshair = document.createElement('div')
    crosshair.className = 'crosshair'
    cursor.appendChild(crosshair)
    document.body.appendChild(cursor)

    const move = (e: MouseEvent) =>
      requestAnimationFrame(() => {
        cursor.style.left = `${e.clientX}px`
        cursor.style.top = `${e.clientY}px`
      })
    const click = () => {
      if (cursor.classList.contains('clicked')) {
        cursor.classList.remove('clicked')
        void cursor.offsetWidth
      }
      cursor.classList.add('clicked')
    }
    const reset = () => {
      crosshair.style.transition = 'none'
      cursor.classList.remove('clicked')
      void crosshair.offsetWidth
      crosshair.style.transition = ''
    }
    const over = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.('a, button, [role="button"], .cursor-pointer, [data-cursor="red"]')) cursor.classList.add('hover')
    }
    const out = () => cursor.classList.remove('hover')

    window.addEventListener('mousemove', move)
    window.addEventListener('mousedown', click)
    document.addEventListener('mouseover', over)
    document.addEventListener('mouseout', out)
    crosshair.addEventListener('transitionend', reset)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mousedown', click)
      document.removeEventListener('mouseover', over)
      document.removeEventListener('mouseout', out)
      crosshair.removeEventListener('transitionend', reset)
      cursor.remove()
    }
  }, [])
  return null
}
