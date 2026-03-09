import { MessageSquare, Phone, PhoneCall, Loader2 } from 'lucide-react'
import { FloatingMenu, type FloatingMenuItemConfig } from './FloatingMenu'
import { useFloatingStore } from '../../stores/floating.store'

/**
 * App-specific floating action menu.
 * Reads chat + phone state from the floating store and renders a unified FAB.
 * To add more items in the future, extend the `items` array below.
 */
export function FloatingFab() {
  const {
    chatOpen,   setChatOpen,
    phoneOpen,  setPhoneOpen,
    phoneFabBg, phoneFabShadow, phoneFabIcon, phoneHasIncoming,
    phoneClickHandler,
    chatUnread,
  } = useFloatingStore()

  const items: FloatingMenuItemConfig[] = [
    // ── Chat item (top) ──────────────────────────────────────────────────────
    {
      id: 'chat',
      icon: <MessageSquare size={18} className="text-white" />,
      label: 'Team Chat',
      onClick: () => setChatOpen(!chatOpen),
      badge: chatUnread > 0
        ? (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 bg-rose-500 text-white font-bold rounded-full flex items-center justify-center border-2 border-white"
            style={{ fontSize: '9px' }}
          >
            {chatUnread > 99 ? '99+' : chatUnread}
          </span>
        )
        : undefined,
      style: {
        background: chatOpen
          ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
          : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        boxShadow: '0 4px 16px rgba(79,70,229,.4)',
      },
    },

    // ── Phone item (bottom, closest to main button) ───────────────────────────
    {
      id: 'phone',
      icon: phoneFabIcon === 'loading'
        ? <Loader2 size={18} className="text-white animate-spin" />
        : phoneFabIcon === 'calling'
          ? <PhoneCall size={18} className="text-white animate-pulse" />
          : <Phone size={18} className="text-white" />,
      label: 'Web Phone',
      onClick: () => {
        if (phoneClickHandler) {
          phoneClickHandler()
        } else {
          setPhoneOpen(!phoneOpen)
        }
      },
      badge: phoneHasIncoming
        ? <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(99,102,241,0.35)' }} />
        : undefined,
      style: {
        background: phoneFabBg,
        boxShadow: phoneFabShadow,
      },
    },
  ]

  const anyOpen = chatOpen || phoneOpen
  return <FloatingMenu items={items} visible={!anyOpen} />
}
