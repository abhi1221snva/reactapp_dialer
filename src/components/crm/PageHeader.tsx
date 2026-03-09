interface PageHeaderProps {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode  // right-side controls (buttons, selects, etc.)
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{title}</h1>
        {description !== undefined && (
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
      )}
    </div>
  )
}
