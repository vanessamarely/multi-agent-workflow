import { TravelRequest, AgentState, TravelPlan } from './types'

type AgentUpdateCallback = (agent: AgentState) => void

export class TravelAgentOrchestrator {
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

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async executePlan(request: TravelRequest): Promise<TravelPlan> {
    this.updateAgent('flight', 'idle')
    this.updateAgent('hotel', 'idle')
    this.updateAgent('activity', 'idle')
    this.updateAgent('itinerary', 'idle')

    await this.delay(500)

    const parallelResults = await this.executeParallelAgents(request)

    await this.delay(300)

    const itinerary = await this.executeItineraryAgent(request, parallelResults)

    return {
      ...parallelResults,
      itinerary,
    }
  }

  private async executeParallelAgents(request: TravelRequest) {
    this.updateAgent('flight', 'working')
    this.updateAgent('hotel', 'working')
    this.updateAgent('activity', 'working')

    const [flights, hotels, activities] = await Promise.all([
      this.flightAgent(request),
      this.hotelAgent(request),
      this.activityAgent(request),
    ])

    this.updateAgent('flight', 'done', flights)
    this.updateAgent('hotel', 'done', hotels)
    this.updateAgent('activity', 'done', activities)

    return { flights, hotels, activities }
  }

  private async executeItineraryAgent(
    request: TravelRequest,
    results: { flights: string; hotels: string; activities: string }
  ) {
    this.updateAgent('itinerary', 'working')

    const itinerary = await this.itineraryAgent(request, results)

    this.updateAgent('itinerary', 'done', itinerary)

    return itinerary
  }

  private async flightAgent(request: TravelRequest): Promise<string> {
    const budgetGuide = {
      low: 'economy class, budget airlines',
      medium: 'economy or premium economy, major carriers',
      high: 'business class, premium carriers',
    }

    const prompt = spark.llmPrompt`You are a Flight Agent specialized in finding flight options.

Destination: ${request.destination}
Trip Duration: ${request.duration} days
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

Provide flight recommendations including:
- Suggested airlines and flight routes
- Estimated round-trip costs in USD
- Departure and return timing considerations
- Tips for booking

Keep the response concise (3-4 paragraphs) and practical.`

    return await spark.llm(prompt, 'gpt-4o-mini')
  }

  private async hotelAgent(request: TravelRequest): Promise<string> {
    const budgetGuide = {
      low: '$50-100/night, hostels or budget hotels',
      medium: '$100-250/night, 3-4 star hotels',
      high: '$250+/night, luxury hotels or resorts',
    }

    const prompt = spark.llmPrompt`You are a Hotel Agent specialized in accommodation recommendations.

Destination: ${request.destination}
Trip Duration: ${request.duration} days (${request.duration - 1} nights)
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

Provide hotel recommendations including:
- 2-3 specific hotel options or neighborhoods
- Estimated total accommodation cost
- Key amenities and location benefits
- Booking tips

Keep the response concise (3-4 paragraphs) and practical.`

    return await spark.llm(prompt, 'gpt-4o-mini')
  }

  private async activityAgent(request: TravelRequest): Promise<string> {
    const budgetGuide = {
      low: 'free or low-cost activities, local experiences',
      medium: 'mix of paid attractions and experiences',
      high: 'premium experiences, private tours, fine dining',
    }

    const prompt = spark.llmPrompt`You are an Activity Agent specialized in destination experiences.

Destination: ${request.destination}
Trip Duration: ${request.duration} days
Budget Level: ${request.budget} (${budgetGuide[request.budget]})

Provide activity recommendations including:
- Top 5-7 must-see attractions or experiences
- Restaurant and dining suggestions
- Local tips and hidden gems
- Estimated activity costs

Keep the response concise (4-5 paragraphs) and practical.`

    return await spark.llm(prompt, 'gpt-4o-mini')
  }

  private async itineraryAgent(
    request: TravelRequest,
    results: { flights: string; hotels: string; activities: string }
  ): Promise<string> {
    const prompt = spark.llmPrompt`You are an Itinerary Agent specialized in synthesizing travel plans.

Create a comprehensive day-by-day itinerary for a ${request.duration}-day trip to ${request.destination} with a ${request.budget} budget.

Use this information from specialist agents:

FLIGHTS:
${results.flights}

HOTELS:
${results.hotels}

ACTIVITIES:
${results.activities}

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

    return await spark.llm(prompt, 'gpt-4o')
  }
}
