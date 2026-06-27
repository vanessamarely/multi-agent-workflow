/**
 * App.tsx — Componente raíz de la aplicación.
 *
 * Flujo principal:
 *  1. El usuario llena TravelForm con origen, destino, duración y presupuesto.
 *  2. handleSubmit llama a planTrip() (src/lib/api.ts), que abre una conexión
 *     SSE al backend Express (server/index.ts → POST /api/plan).
 *  3. El backend ejecuta el pipeline ADK multi-agente:
 *       ParallelAgent  → flight_agent, hotel_agent, activity_agent (concurrente)
 *       SequentialAgent → itinerary_agent (espera los tres anteriores)
 *  4. Cada evento SSE del servidor actualiza el estado `agents` en tiempo real,
 *     lo que repinta las AgentCard con el estado actual (idle/working/done/error).
 *  5. Al recibir el evento 'complete', se guarda el TravelPlan y se muestra
 *     TravelMap + ItineraryViewer con los resultados.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TravelForm } from '@/components/TravelForm'
import { AgentCard } from '@/components/AgentCard'
import { ItineraryViewer } from '@/components/ItineraryViewer'
import { TravelMap } from '@/components/TravelMap'
import { Separator } from '@/components/ui/separator'
import { Toaster, toast } from 'sonner'
import { TravelRequest, AgentState, TravelPlan } from '@/lib/types'
import { planTrip } from '@/lib/api'
import { Cpu } from '@phosphor-icons/react'

function App() {
  // Estado inicial de los 4 agentes; cada uno arranca en 'idle'
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    flight: { name: 'flight', label: 'Flight Agent', status: 'idle' },
    hotel: { name: 'hotel', label: 'Hotel Agent', status: 'idle' },
    activity: { name: 'activity', label: 'Activity Agent', status: 'idle' },
    itinerary: { name: 'itinerary', label: 'Itinerary Agent', status: 'idle' },
  })
  const [isProcessing, setIsProcessing] = useState(false)           // bloquea el form durante el procesamiento
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null)          // resultado final del pipeline
  const [currentRequest, setCurrentRequest] = useState<TravelRequest | null>(null) // datos del viaje para el mapa

  // Callback pasado a planTrip(); se invoca cada vez que llega un evento
  // SSE de tipo 'agent_update' del servidor, actualizando el estado de un agente.
  const handleAgentUpdate = (agent: AgentState) => {
    setAgents((prev) => ({
      ...prev,
      [agent.name]: agent,
    }))
  }

  // Se ejecuta cuando el usuario envía el formulario.
  // Resetea el plan anterior, guarda la solicitud (para el mapa) e inicia
  // el streaming SSE con el backend. Cuando la promesa resuelve, el plan
  // completo ya está disponible y se muestra el mapa + el itinerario.
  const handleSubmit = async (request: TravelRequest) => {
    setIsProcessing(true)
    setTravelPlan(null)
    setCurrentRequest(request)

    try {
      // planTrip abre SSE y va llamando handleAgentUpdate por cada evento;
      // resuelve con el TravelPlan completo al recibir 'complete'.
      const plan = await planTrip(request, handleAgentUpdate)
      setTravelPlan(plan)
      toast.success('Your travel plan is ready!')
    } catch (error) {
      console.error('Error generating travel plan:', error)
      toast.error('Failed to generate travel plan. Please ensure the backend server is running.')

      // Marca todos los agentes en error para feedback visual inmediato
      setAgents({
        flight: { name: 'flight', label: 'Flight Agent', status: 'error' },
        hotel: { name: 'hotel', label: 'Hotel Agent', status: 'error' },
        activity: { name: 'activity', label: 'Activity Agent', status: 'error' },
        itinerary: { name: 'itinerary', label: 'Itinerary Agent', status: 'error' },
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Limpia todo el estado para permitir planificar un nuevo viaje
  const handleReset = () => {
    setTravelPlan(null)
    setCurrentRequest(null)
    setAgents({
      flight: { name: 'flight', label: 'Flight Agent', status: 'idle' },
      hotel: { name: 'hotel', label: 'Hotel Agent', status: 'idle' },
      activity: { name: 'activity', label: 'Activity Agent', status: 'idle' },
      itinerary: { name: 'itinerary', label: 'Itinerary Agent', status: 'idle' },
    })
  }

  const agentList = Object.values(agents)

  return (
    <>
      <Toaster position="top-center" richColors />
      
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Cpu size={32} weight="duotone" className="text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                AI Travel Planner
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Watch specialized AI agents collaborate using Google ADK patterns (ParallelAgent + SequentialAgent) to build your perfect travel itinerary
            </p>
          </motion.header>

          <Separator />

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <TravelForm onSubmit={handleSubmit} isLoading={isProcessing} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-mono text-muted-foreground uppercase tracking-wide">
                  Agent Status
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <AnimatePresence mode="wait">
                  {agentList.map((agent, index) => (
                    <motion.div
                      key={agent.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AgentCard agent={agent} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {travelPlan && currentRequest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <Separator className="my-8" />
              <TravelMap destination={currentRequest.destination} origin={currentRequest.origin} />
              <ItineraryViewer plan={travelPlan} onReset={handleReset} />
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}

export default App