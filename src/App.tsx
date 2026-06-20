import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TravelForm } from '@/components/TravelForm'
import { AgentCard } from '@/components/AgentCard'
import { ItineraryViewer } from '@/components/ItineraryViewer'
import { Separator } from '@/components/ui/separator'
import { Toaster, toast } from 'sonner'
import { TravelRequest, AgentState, TravelPlan } from '@/lib/types'
import { MultiAgentOrchestrator } from '@/lib/agents/MultiAgentOrchestrator'
import { Cpu } from '@phosphor-icons/react'

function App() {
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    flight: { name: 'flight', label: 'Flight Agent', status: 'idle' },
    hotel: { name: 'hotel', label: 'Hotel Agent', status: 'idle' },
    activity: { name: 'activity', label: 'Activity Agent', status: 'idle' },
    itinerary: { name: 'itinerary', label: 'Itinerary Agent', status: 'idle' },
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null)

  const handleAgentUpdate = (agent: AgentState) => {
    setAgents((prev) => ({
      ...prev,
      [agent.name]: agent,
    }))
  }

  const handleSubmit = async (request: TravelRequest) => {
    setIsProcessing(true)
    setTravelPlan(null)

    try {
      const orchestrator = new MultiAgentOrchestrator(handleAgentUpdate)
      const plan = await orchestrator.executePlan(request)
      setTravelPlan(plan)
      toast.success('Your travel plan is ready!')
    } catch (error) {
      console.error('Error generating travel plan:', error)
      toast.error('Failed to generate travel plan. Please try again.')
      
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

  const handleReset = () => {
    setTravelPlan(null)
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
              Watch specialized AI agents collaborate in real-time to build your perfect travel itinerary
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

          {travelPlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Separator className="my-8" />
              <ItineraryViewer plan={travelPlan} onReset={handleReset} />
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}

export default App