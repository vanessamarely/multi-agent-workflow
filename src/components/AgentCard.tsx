/**
 * AgentCard.tsx — Tarjeta de estado en tiempo real para un agente ADK.
 *
 * Muestra el nombre del agente, un ícono representativo, el estado actual
 * (idle / working / done / error) como badge y, cuando el agente finaliza,
 * una vista previa recortada de su output.
 *
 * El estado 'working' activa un efecto shimmer animado para indicar actividad.
 * Los colores del badge y del ícono cambian automáticamente según el estado.
 */
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgentState } from '@/lib/types'
import { Airplane, Buildings, Compass, ListChecks } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: AgentState
}

// Mapea el nombre del agente a su ícono visual correspondiente
const iconMap = {
  flight: Airplane,
  hotel: Buildings,
  activity: Compass,
  itinerary: ListChecks,
}

// Clases CSS para el badge según el estado del agente
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
        // Anillo de acento + sombra cuando el agente está trabajando
        agent.status === 'working' &&
          'ring-2 ring-accent shadow-lg shadow-accent/20 relative overflow-hidden'
      )}
    >
      {/* Capa de shimmer animada solo visible durante 'working' */}
      {agent.status === 'working' && (
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />
      )}
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg transition-colors',
                // El ícono cambia de color según el estado para refuerzo visual
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

        {/* Muestra los primeros 150 caracteres del output cuando el agente termina */}
        {agent.output && (
          <div className="text-sm text-muted-foreground line-clamp-3 pt-2 border-t border-border">
            {agent.output.substring(0, 150)}...
          </div>
        )}
      </div>
    </Card>
  )
}
