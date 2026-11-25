import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Pencil, Trash2 } from 'lucide-react'

export function OrderContextMenu({
  order,
  onOpenOrder,
  onEditOrder,
  onDeleteOrder,
  children,
}) {
  const [position, setPosition] = useState(null)
  const menuRef = useRef(null)
  const child = React.Children.only(children)

  useEffect(() => {
    if (!position) return undefined

    const focusFirstItem = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus()
    })
    const closeOnOutsidePointer = (event) => {
      if (!menuRef.current?.contains(event.target)) setPosition(null)
    }
    const handleKeyDown = (event) => {
      const items = menuRef.current?.querySelectorAll('[role="menuitem"]')
      if (!items?.length) return

      const currentIndex = Array.from(items).indexOf(document.activeElement)
      if (event.key === 'Escape') {
        event.preventDefault()
        setPosition(null)
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const offset = event.key === 'ArrowDown' ? 1 : -1
        const nextIndex =
          currentIndex < 0
            ? offset > 0
              ? 0
              : items.length - 1
            : (currentIndex + offset + items.length) % items.length
        items[nextIndex].focus()
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        items[event.key === 'Home' ? 0 : items.length - 1].focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFirstItem)
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [position])

  const handleContextMenu = (event) => {
    child.props.onContextMenu?.(event)
    if (event.defaultPrevented) return

    event.preventDefault()
    setPosition({ x: event.clientX, y: event.clientY })
  }

  const closeAndRun = (callback) => {
    setPosition(null)
    callback?.(order)
  }

  return (
    <>
      {React.cloneElement(child, { onContextMenu: handleContextMenu })}
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${order.item || 'record'}`}
            className="fixed z-[100] min-w-48 rounded-md border border-slate-700 bg-[#121826] p-1 text-slate-100 shadow-xl"
            style={{
              left: Math.max(8, Math.min(position.x, window.innerWidth - 200)),
              top: Math.max(8, Math.min(position.y, window.innerHeight - 160)),
              maxHeight: 'calc(100vh - 16px)',
              overflowY: 'auto',
            }}
          >
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Order actions
            </div>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-slate-800 focus:bg-slate-800"
              onClick={() => closeAndRun(onEditOrder)}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit record
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-slate-800 focus:bg-slate-800"
              onClick={() => closeAndRun(onOpenOrder)}
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              View details
            </button>
            {onDeleteOrder && (
              <>
                <div role="separator" className="my-1 h-px bg-slate-700/70" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs text-destructive outline-none hover:bg-destructive/15 focus:bg-destructive/15"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Permanently delete order #${order.id.slice(0, 8)} ("${order.item}")?`
                      )
                    ) {
                      closeAndRun(onDeleteOrder)
                    } else {
                      setPosition(null)
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete record
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </>
  )
}
