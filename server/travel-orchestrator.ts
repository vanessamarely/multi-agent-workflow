/**
 * ADK Multi-Agent Travel Planner Orchestrator
 *
 * Workflow:
 *   SequentialAgent (travelPipeline)
 *   ├── ParallelAgent (researchTeam)   ← runs concurrently
 *   │   ├── LlmAgent (flight_agent)    → outputKey: 'flight_results'
 *   │   ├── LlmAgent (hotel_agent)     → outputKey: 'hotel_results'
 *   │   └── LlmAgent (activity_agent) → outputKey: 'activity_results'
 *   └── LlmAgent (itinerary_agent)    ← reads session state set by parallel agents
 */

import {
  LlmAgent,
  ParallelAgent,
  SequentialAgent,
  Runner,
  InMemorySessionService,
} from '@google/adk'
import type { ReadonlyContext } from '@google/adk'

const FLASH_MODEL = 'gemini-2.5-flash'
const PRO_MODEL = 'gemini-2.5-pro'

// ──────────────────────────────────────────────
// Specialist Agents (run in parallel)
// Each agent stores its output in session state
// via `outputKey` so the itinerary agent can read it.
// ──────────────────────────────────────────────

const flightAgent = new LlmAgent({
  name: 'flight_agent',
  model: FLASH_MODEL,
  instruction: `You are a Flight Agent specialized in finding flight options for travelers.
Given the travel details in the user message, provide:
- Suggested airlines and flight routes
- Estimated round-trip costs in USD based on budget level (low = economy/budget airlines, medium = economy/major carriers, high = business class)
- Best departure and return timing considerations
- Practical booking tips

Keep the response concise (3-4 paragraphs) and practical.`,
  outputKey: 'flight_results',
})

const hotelAgent = new LlmAgent({
  name: 'hotel_agent',
  model: FLASH_MODEL,
  instruction: `You are a Hotel Agent specialized in accommodation recommendations.
Given the travel details in the user message, provide:
- Recommended neighborhoods or areas to stay
- Hotel options and types that match the budget level with estimated nightly rates
- Key amenities to look for
- Practical booking tips

Keep the response concise (3-4 paragraphs) and practical.`,
  outputKey: 'hotel_results',
})

const activityAgent = new LlmAgent({
  name: 'activity_agent',
  model: FLASH_MODEL,
  instruction: `You are an Activity Agent specialized in travel experiences and attractions.
Given the travel details in the user message, provide:
- Top must-see attractions and experiences
- Hidden gems and local favorites
- Estimated costs for activities
- Tips for the best experience

Keep the response concise (3-4 paragraphs) and practical.`,
  outputKey: 'activity_results',
})

// ──────────────────────────────────────────────
// Itinerary Agent (runs after parallel agents)
// Reads session state populated by flightAgent,
// hotelAgent, and activityAgent via their outputKeys.
// ──────────────────────────────────────────────

const itineraryAgent = new LlmAgent({
  name: 'itinerary_agent',
  model: PRO_MODEL,
  instruction: (ctx: ReadonlyContext): string => {
    const flights =
      ctx.state.get<string>('flight_results') ?? 'No flight data available'
    const hotels =
      ctx.state.get<string>('hotel_results') ?? 'No hotel data available'
    const activities =
      ctx.state.get<string>('activity_results') ?? 'No activity data available'

    return `You are a Master Travel Planner. Using the research below from specialized agents, create a comprehensive day-by-day travel itinerary.

## Flight Research:
${flights}

## Hotel Research:
${hotels}

## Activity Research:
${activities}

Create a well-structured itinerary that includes:
1. A day-by-day schedule with morning, afternoon, and evening activities
2. Accommodation recommendations per night
3. Practical logistics and travel tips
4. A budget summary
5. Important notes and recommendations`
  },
  outputKey: 'itinerary_results',
})

// ──────────────────────────────────────────────
// ADK Workflow composition
// ──────────────────────────────────────────────

// ParallelAgent: runs flight, hotel, activity concurrently via Promise.all internally
const researchTeam = new ParallelAgent({
  name: 'research_team',
  subAgents: [flightAgent, hotelAgent, activityAgent],
})

// SequentialAgent: first executes researchTeam (parallel), then itineraryAgent
export const travelPipeline = new SequentialAgent({
  name: 'travel_pipeline',
  subAgents: [researchTeam, itineraryAgent],
})

// ──────────────────────────────────────────────
// Runner factory
// ──────────────────────────────────────────────

export function createTravelRunner() {
  const sessionService = new InMemorySessionService()

  const runner = new Runner({
    appName: 'travel-planner',
    agent: travelPipeline,
    sessionService,
  })

  return { runner, sessionService }
}
