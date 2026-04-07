import { useState, type ReactNode } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { cn } from '../../utils/cn'

type TabKey = 'graph' | 'table'

interface ReportViewTabsProps {
  graphContent: ReactNode
  tableContent: ReactNode
  defaultTab?: TabKey
}

export function ReportViewTabs({ graphContent, tableContent, defaultTab = 'graph' }: ReportViewTabsProps) {
  const [active, setActive] = useState<TabKey>(defaultTab)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-5">
        <button
          onClick={() => setActive('graph')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            active === 'graph'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <BarChart3 size={15} />
          Graph View
        </button>
        <button
          onClick={() => setActive('table')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            active === 'table'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Table2 size={15} />
          Table View
        </button>
      </div>

      {/* Tab content */}
      <div
        key={active}
        className="animate-fadeIn"
        style={{ minHeight: 200 }}
      >
        {active === 'graph' ? graphContent : tableContent}
      </div>
    </div>
  )
}
