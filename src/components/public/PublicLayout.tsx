import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatedBg } from './AnimatedBg'
import { PublicNavbar } from './PublicNavbar'
import { PublicFooter } from './PublicFooter'

export function PublicLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <AnimatedBg />
      <PublicNavbar />
      <Outlet />
      <PublicFooter />
    </div>
  )
}
