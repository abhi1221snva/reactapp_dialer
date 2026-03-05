import { cn } from '../../utils/cn'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }

export function LoadingSpinner({ size = 'md', className }: Props) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn('animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600', sizes[size])} />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
