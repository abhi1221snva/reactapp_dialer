import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crmService } from '../../services/crm.service'
import { KanbanBoard } from '../../components/crm/KanbanBoard'
import { useCrmHeader } from '../../layouts/CrmLayout'

export function CrmPipeline() {
  const [filterAgent, setFilterAgent] = useState<number | undefined>()
  const { setDescription, setActions } = useCrmHeader()

  const { data: usersData } = useQuery({
    queryKey: ['crm-users-for-pipeline'],
    queryFn: () => crmService.getUsers(),
  })

  const agents = usersData ?? []

  useEffect(() => {
    setDescription('Drag and drop leads between stages')
    setActions(
      <select
        value={filterAgent ?? ''}
        onChange={e => setFilterAgent(e.target.value ? Number(e.target.value) : undefined)}
        className="input text-sm"
        style={{ minWidth: '160px' }}
      >
        <option value="">All agents</option>
        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    )
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAgent, agents])

  return (
    <KanbanBoard filterAssignedTo={filterAgent} />
  )
}
