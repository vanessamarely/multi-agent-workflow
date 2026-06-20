import { BaseAgent, BaseAgentConfig } from './base'
import { TravelRequest } from '../types'

export class FlightAgent extends BaseAgent {
  constructor(config: Omit<BaseAgentConfig, 'name' | 'description'>) {
    super({
      ...config,
      name: 'flightAgent',
      description: 'Specializes in finding flight options and estimating travel costs'
    })
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')

    try {
      const budgetGuide = {
        low: 'economy class, budget airlines',
        medium: 'economy or premium economy, major carriers',
        high: 'business class, premium carriers'
      }

      const prompt = `You are a Flight Agent specialized in finding flight options.

Destination: ${request.destination}
Trip Duration: ${request.duration} days
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

Provide flight recommendations including:
- Suggested airlines and flight routes
- Estimated round-trip costs in USD
- Departure and return timing considerations
- Tips for booking

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
