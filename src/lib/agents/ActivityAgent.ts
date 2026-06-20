import { BaseAgent, AgentUpdateCallback } from './BaseAgent'
import { TravelRequest } from '../types'

export class ActivityAgent extends BaseAgent {
  constructor(onUpdate: AgentUpdateCallback) {
    super('activity', 'Activity Agent', onUpdate)
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')

    try {
      const budgetGuide = {
        low: 'free or low-cost activities, local experiences, street food',
        medium: 'mix of paid attractions and experiences, casual dining',
        high: 'premium experiences, private tours, fine dining, VIP access',
      }

      const prompt = spark.llmPrompt`You are a specialized Activity Agent in a multi-agent travel planning system.

Your role: Research and recommend activities, attractions, and dining based on destination and budget.

TRAVEL REQUEST:
Destination: ${request.destination}
Trip Duration: ${request.duration} days
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

TASK:
Provide activity and dining recommendations including:
1. Top 5-7 must-see attractions or unique experiences (prioritize by importance)
2. Restaurant and dining suggestions (3-4 specific recommendations with cuisine types)
3. Local tips and hidden gems (insider knowledge, best times to visit)
4. Estimated activity costs (total budget needed for activities and dining)

Keep the response concise (4-5 paragraphs), practical, and focused on actionable information. Use markdown formatting for readability.`

      const result = await spark.llm(prompt, 'gpt-4o-mini')
      
      this.updateStatus('done', result)
      return result
    } catch (error) {
      this.updateStatus('error')
      throw error
    }
  }
}
