import { cn } from '../../utils/cn'

type Variant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple'

interface Props {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

const variants: Record<Variant, string> = {
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  blue: 'badge-blue',
  gray: 'badge-gray',
  purple: 'badge-purple',
}

export function Badge({ variant = 'gray', children, className }: Props) {
  return <span className={cn(variants[variant], className)}>{children}</span>
}
