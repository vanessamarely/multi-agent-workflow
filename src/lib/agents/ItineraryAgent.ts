import { BaseAgent, AgentUpdateCallback } from './BaseAgent'
import { TravelRequest } from '../types'

interface AgentResults {
  flights: string
  hotels: string
  activities: string
}

export class ItineraryAgent extends BaseAgent {
  constructor(onUpdate: AgentUpdateCallback) {
    super('itinerary', 'Itinerary Agent', onUpdate)
  }

  async execute(input: { request: TravelRequest; results: AgentResults }): Promise<string> {
    this.updateStatus('working')

    try {
      const { request, results } = input

      const prompt = spark.llmPrompt`You are a specialized Itinerary Agent in a multi-agent travel planning system.

Your role: Synthesize recommendations from multiple specialist agents into a cohesive day-by-day travel itinerary.

TRAVEL REQUEST:
Destination: ${request.destination}
Duration: ${request.duration} days
Budget: ${request.budget}

SPECIALIST AGENT RECOMMENDATIONS:

=== FLIGHT AGENT OUTPUT ===
${results.flights}

=== HOTEL AGENT OUTPUT ===
${results.hotels}

=== ACTIVITY AGENT OUTPUT ===
${results.activities}

TASK:
Create a comprehensive day-by-day itinerary that:
1. Accounts for arrival and departure (first and last day logistics)
2. Distributes activities logically across days (consider proximity and timing)
3. Includes meal suggestions at appropriate times
4. Balances must-see attractions with relaxation and free time
5. Provides realistic timing and logistics (travel time between locations)
6. Incorporates the hotels, activities, and restaurants mentioned by the specialist agents

FORMAT (use markdown):
## Day 1: [Theme/Focus]
**Morning (9:00 AM - 12:00 PM)**
- [Activity/Location]
- [Details and tips]

**Afternoon (12:00 PM - 5:00 PM)**
- [Lunch suggestion]
- [Activity/Location]
- [Details and tips]

**Evening (5:00 PM - 9:00 PM)**
- [Dinner suggestion]
- [Activity/Location]
- [Details and tips]

## Day 2: [Theme/Focus]
[Continue same format...]

At the end, include:

## 💰 Estimated Budget Summary
- Flights: $XXX - $XXX
- Accommodations: $XXX - $XXX (${request.duration - 1} nights)
- Activities & Dining: $XXX - $XXX
- **Total Estimated Cost: $XXX - $XXX per person**

## 📝 Important Notes
[Any important tips, visa requirements, best time to visit, packing suggestions, etc.]

Make the itinerary detailed, practical, and exciting. This should feel like a professional travel plan.`

      const result = await spark.llm(prompt, 'gpt-4o')
      
      this.updateStatus('done', result)
      return result
    } catch (error) {
      this.updateStatus('error')
      throw error
    }
  }
}
