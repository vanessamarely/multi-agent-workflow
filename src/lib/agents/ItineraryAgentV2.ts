import { BaseAgent, BaseAgentConfig } from './base'
import { TravelRequest } from '../types'

export interface ItineraryContext {
  flights: string
  hotels: string
  activities: string
}

export class ItineraryAgent extends BaseAgent {
  constructor(config: Omit<BaseAgentConfig, 'name' | 'description'>) {
    super({
      ...config,
      name: 'itineraryAgent',
      description: 'Synthesizes all agent outputs into a structured day-by-day itinerary'
    })
  }

  async execute(request: TravelRequest, context?: Record<string, string>): Promise<string> {
    this.updateStatus('working')

    if (!context || !context.flightAgent || !context.hotelAgent || !context.activityAgent) {
      throw new Error('ItineraryAgent requires context from other agents')
    }

    const itineraryContext: ItineraryContext = {
      flights: context.flightAgent,
      hotels: context.hotelAgent,
      activities: context.activityAgent
    }

    try {
      const prompt = `You are an Itinerary Agent specialized in synthesizing travel plans.

Create a comprehensive day-by-day itinerary for a ${request.duration}-day trip to ${request.destination} with a ${request.budget} budget.

Use this information from specialist agents:

FLIGHTS:
${itineraryContext.flights}

HOTELS:
${itineraryContext.hotels}

ACTIVITIES:
${itineraryContext.activities}

Create a detailed day-by-day itinerary that:
1. Includes arrival and departure (first and last day)
2. Distributes activities logically across days
3. Includes meal suggestions
4. Balances must-see attractions with relaxation
5. Provides realistic timing and logistics

Format the response as:
## Day 1: [Theme]
- Morning: ...
- Afternoon: ...
- Evening: ...

## Day 2: [Theme]
...

Include a brief cost summary at the end with estimated totals for flights, hotels, and activities.`

      const result = await this.model.generateContent(prompt)
      const response = result.response
      const output = response.text()

      this.updateStatus('done')
      return output
    } catch (error) {
      this.updateStatus('error')
      throw error
    }
  }
}
