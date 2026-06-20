import { BaseAgent, BaseAgentConfig } from './base'
import { TravelRequest } from '../types'

export class ActivityAgent extends BaseAgent {
  constructor(config: Omit<BaseAgentConfig, 'name' | 'description'>) {
    super({
      ...config,
      name: 'activityAgent',
      description: 'Specializes in suggesting activities, restaurants, and local experiences'
    })
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')

    try {
      const budgetGuide = {
        low: 'free or low-cost activities, local experiences',
        medium: 'mix of paid attractions and experiences',
        high: 'premium experiences, private tours, fine dining'
      }

      const prompt = `You are an Activity Agent specialized in destination experiences.

Destination: ${request.destination}
Trip Duration: ${request.duration} days
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

Provide activity recommendations including:
- Top 5-7 must-see attractions or experiences
- Restaurant and dining suggestions
- Local tips and hidden gems
- Estimated activity costs

Keep the response concise (4-5 paragraphs) and practical.`

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
