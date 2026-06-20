import { TravelRequest, TravelPlan } from '../types'
import { AgentUpdateCallback } from './BaseAgent'
import { FlightAgent } from './FlightAgent'
import { HotelAgent } from './HotelAgent'
import { ActivityAgent } from './ActivityAgent'
import { ItineraryAgent } from './ItineraryAgent'
import { ParallelAgent } from './ParallelAgent'

export class MultiAgentOrchestrator {
  private onUpdate: AgentUpdateCallback

  constructor(onUpdate: AgentUpdateCallback) {
    this.onUpdate = onUpdate
  }

  async executePlan(request: TravelRequest): Promise<TravelPlan> {
    const flightAgent = new FlightAgent(this.onUpdate)
    const hotelAgent = new HotelAgent(this.onUpdate)
    const activityAgent = new ActivityAgent(this.onUpdate)
    const itineraryAgent = new ItineraryAgent(this.onUpdate)

    const parallelAgent = new ParallelAgent<TravelRequest, string>([
      flightAgent,
      hotelAgent,
      activityAgent,
    ])

    const [flights, hotels, activities] = await parallelAgent.execute(request)

    const itinerary = await itineraryAgent.execute({
      request,
      results: { flights, hotels, activities },
    })

    return {
      flights,
      hotels,
      activities,
      itinerary,
    }
  }
}
