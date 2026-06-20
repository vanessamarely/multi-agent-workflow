import { BaseAgent, BaseAgentConfig } from './base'
import { TravelRequest } from '../types'

export class HotelAgent extends BaseAgent {
  constructor(config: Omit<BaseAgentConfig, 'name' | 'description'>) {
    super({
      ...config,
      name: 'hotelAgent',
      description: 'Specializes in accommodation recommendations based on budget and duration'
    })
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')

    try {
      const budgetGuide = {
        low: '$50-100/night, hostels or budget hotels',
        medium: '$100-250/night, 3-4 star hotels',
        high: '$250+/night, luxury hotels or resorts'
      }

      const prompt = `You are a Hotel Agent specialized in accommodation recommendations.

Destination: ${request.destination}
Trip Duration: ${request.duration} days (${request.duration - 1} nights)
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

Provide hotel recommendations including:
- 2-3 specific hotel options or neighborhoods
- Estimated total accommodation cost
- Key amenities and location benefits
- Booking tips

Keep the response concise (3-4 paragraphs) and practical.`

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
