import { TravelRequest, AgentState, TravelPlan } from '../types'
import { getFlashModel, getProModel } from '../gemini-config'
import { FlightAgent } from './FlightAgentV2'
import { HotelAgent } from './HotelAgentV2'
import { ActivityAgent } from './ActivityAgentV2'
import { ItineraryAgent } from './ItineraryAgentV2'
import { ParallelAgent } from './ParallelAgentV2'
import { SequentialAgent } from './SequentialAgentV2'

type AgentUpdateCallback = (agent: AgentState) => void

export class GeminiMultiAgentOrchestrator {
  private onUpdate: AgentUpdateCallback

  constructor(onUpdate: AgentUpdateCallback) {
    this.onUpdate = onUpdate
  }

  private updateAgent(name: AgentState['name'], status: AgentState['status'], output?: string) {
    const labels = {
      flight: 'Flight Agent',
      hotel: 'Hotel Agent',
      activity: 'Activity Agent',
      itinerary: 'Itinerary Agent',
    }

    this.onUpdate({
      name,
      label: labels[name],
      status,
      output,
    })
  }

  async executePlan(request: TravelRequest): Promise<TravelPlan> {
    const flashModel = getFlashModel()
    const proModel = getProModel()

    this.updateAgent('flight', 'idle')
    this.updateAgent('hotel', 'idle')
    this.updateAgent('activity', 'idle')
    this.updateAgent('itinerary', 'idle')

    const flightAgent = new FlightAgent({
      model: flashModel,
      onStatusChange: (status) => this.updateAgent('flight', status)
    })

    const hotelAgent = new HotelAgent({
      model: flashModel,
      onStatusChange: (status) => this.updateAgent('hotel', status)
    })

    const activityAgent = new ActivityAgent({
      model: flashModel,
      onStatusChange: (status) => this.updateAgent('activity', status)
    })

    const itineraryAgent = new ItineraryAgent({
      model: proModel,
      onStatusChange: (status) => this.updateAgent('itinerary', status)
    })

    const researchTeam = new ParallelAgent({
      name: 'researchTeam',
      subAgents: [flightAgent, hotelAgent, activityAgent]
    })

    const travelPipeline = new SequentialAgent({
      name: 'travelPipeline',
      subAgents: [researchTeam, itineraryAgent]
    })

    const results = await travelPipeline.execute(request)

    return {
      flights: results.flightAgent || '',
      hotels: results.hotelAgent || '',
      activities: results.activityAgent || '',
      itinerary: results.itineraryAgent || ''
    }
  }
}
