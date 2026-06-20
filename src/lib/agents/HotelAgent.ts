import { BaseAgent, AgentUpdateCallback } from './BaseAgent'
import { TravelRequest } from '../types'

export class HotelAgent extends BaseAgent {
  constructor(onUpdate: AgentUpdateCallback) {
    super('hotel', 'Hotel Agent', onUpdate)
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')

    try {
      const budgetGuide = {
        low: '$50-100/night, hostels or budget hotels',
        medium: '$100-250/night, 3-4 star hotels',
        high: '$250+/night, luxury hotels or resorts',
      }

      const prompt = spark.llmPrompt`You are a specialized Hotel Agent in a multi-agent travel planning system.

Your role: Research and recommend accommodations based on destination, duration, and budget.

TRAVEL REQUEST:
Destination: ${request.destination}
Trip Duration: ${request.duration} days (${request.duration - 1} nights)
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

TASK:
Provide hotel recommendations including:
1. 2-3 specific hotel options or recommended neighborhoods
2. Estimated total accommodation cost for the stay
3. Key amenities and location benefits (proximity to attractions, transportation)
4. Booking tips (best platforms, when to book)

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
