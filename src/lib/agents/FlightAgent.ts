import { BaseAgent, AgentUpdateCallback } from './BaseAgent'
import { TravelRequest } from '../types'

export class FlightAgent extends BaseAgent {
  constructor(onUpdate: AgentUpdateCallback) {
    super('flight', 'Flight Agent', onUpdate)
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')

    try {
      const budgetGuide = {
        low: 'economy class, budget airlines',
        medium: 'economy or premium economy, major carriers',
        high: 'business class, premium carriers',
      }

      const prompt = spark.llmPrompt`You are a specialized Flight Agent in a multi-agent travel planning system.

Your role: Research and recommend flight options based on destination, duration, and budget.

TRAVEL REQUEST:
Destination: ${request.destination}
Trip Duration: ${request.duration} days
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

TASK:
Provide flight recommendations including:
1. Suggested airlines and flight routes (consider major hubs and connections)
2. Estimated round-trip costs in USD (provide realistic ranges)
3. Departure and return timing considerations (best times to fly)
4. Booking tips (when to book, how to save money)

Keep the response concise (3-4 paragraphs), practical, and focused on actionable information. Use markdown formatting for readability.`

      const result = await spark.llm(prompt, 'gpt-4o-mini')
      
      this.updateStatus('done', result)
      return result
    } catch (error) {
      this.updateStatus('error')
      throw error
    }
  }
}
