import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgentState } from '@/lib/types'
import { Airplane, Buildings, Compass, ListChecks } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: AgentState
}

const iconMap = {
  flight: Airplane,
  hotel: Buildings,
  activity: Compass,
  itinerary: ListChecks,
}

const statusColors = {
  idle: 'bg-muted text-muted-foreground',
  working: 'bg-accent text-accent-foreground animate-pulse-glow',
  done: 'bg-primary text-primary-foreground',
  error: 'bg-destructive text-destructive-foreground',
}

export function AgentCard({ agent }: AgentCardProps) {
  const Icon = iconMap[agent.name]

  return (
    <Card
      className={cn(
        'p-6 transition-all duration-300',
        agent.status === 'working' &&
          'ring-2 ring-accent shadow-lg shadow-accent/20 relative overflow-hidden'
      )}
    >
      {agent.status === 'working' && (
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />
      )}
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg transition-colors',
                agent.status === 'working'
                  ? 'bg-accent text-accent-foreground'
                  : agent.status === 'done'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon size={24} weight="duotone" />
            </div>
            <h3 className="font-semibold text-lg">{agent.label}</h3>
          </div>
          <Badge className={cn('font-mono text-xs', statusColors[agent.status])}>
            {agent.status.toUpperCase()}
          </Badge>
        </div>

        {agent.output && (
          <div className="text-sm text-muted-foreground line-clamp-3 pt-2 border-t border-border">
            {agent.output.substring(0, 150)}...
          </div>
        )}
      </div>
    </Card>
  )
}
