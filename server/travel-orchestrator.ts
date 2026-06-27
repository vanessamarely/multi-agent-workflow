/**
 * server/travel-orchestrator.ts — Composición del pipeline ADK multi-agente.
 *
 * Arquitectura del workflow (patrón Google ADK):
 *
 *   SequentialAgent (travelPipeline)
 *   ├── ParallelAgent (researchTeam)     ← Los 3 agentes corren CONCURRENTES
 *   │   ├── LlmAgent (flight_agent)    → outputKey: 'flight_results'
 *   │   ├── LlmAgent (hotel_agent)     → outputKey: 'hotel_results'
 *   │   └── LlmAgent (activity_agent)  → outputKey: 'activity_results'
 *   └── LlmAgent (itinerary_agent)      ← Lee session state de los 3 anteriores
 *
 * El outputKey de cada LlmAgent guarda su respuesta en el estado de sesión.
 * El itinerary_agent accede a esos valores mediante ctx.state.get() en su
 * función de instrucción dinámica para consolidar un plan de viaje completo.
 */

import {
  LlmAgent,
  ParallelAgent,
  SequentialAgent,
  Runner,
  InMemorySessionService,
} from '@google/adk'
import type { ReadonlyContext } from '@google/adk'

// Se usan dos modelos distintos según la carga de trabajo:
//   Flash → más rápido y económico, ideal para los 3 agentes paralelos
//   Pro   → mejor calidad de razonamiento para el itinerario final
const FLASH_MODEL = 'gemini-2.5-flash'
const PRO_MODEL = 'gemini-2.5-pro'

// ──────────────────────────────────────────────
// Agentes especialistas (corren en paralelo)
// Cada agente recibe el mismo mensaje del usuario y guarda
// su respuesta en session state usando `outputKey`.
// ──────────────────────────────────────────────

// flight_agent: especializado en opciones de vuelo según presupuesto y ruta
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
  outputKey: 'flight_results',  // Clave en session state donde se guarda la respuesta
})

// hotel_agent: especializado en recomendaciones de alojamiento
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

// activity_agent: especializado en atracciones, experiencias y gastronomía
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
// Agente orquestador (corre después del ParallelAgent)
// Lee los 3 outputKeys del estado de sesión para consolidar
// un itinerario día a día que integra vuelos, hotel y actividades.
// Usa una función de instrucción dinámica (ctx.state.get) porque
// los datos de los agentes paralelos solo están disponibles en runtime.
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
// Composición del workflow ADK
// ──────────────────────────────────────────────

// ParallelAgent: ejecuta los 3 agentes especialistas de forma concurrente
// (internamente usa Promise.all), reduciendo el tiempo total de respuesta
const researchTeam = new ParallelAgent({
  name: 'research_team',
  subAgents: [flightAgent, hotelAgent, activityAgent],
})

// SequentialAgent: garantiza el orden de ejecución
// Primero researchTeam (paralelo), luego itineraryAgent (que depende del anterior)
export const travelPipeline = new SequentialAgent({
  name: 'travel_pipeline',
  subAgents: [researchTeam, itineraryAgent],
})

// ──────────────────────────────────────────────
// Factory del Runner
// ──────────────────────────────────────────────

/**
 * createTravelRunner — Crea una instancia del Runner ADK con sesión en memoria.
 *
 * Se llama una vez por petición HTTP desde index.ts para garantizar
 * aislamiento de estado entre usuarios concurrentes.
 * InMemorySessionService es apropiado para desarrollo; en producción
 * se reemplazaría por un servicio de sesión persistente.
 */
export function createTravelRunner() {
  // InMemorySessionService almacena el estado de sesión en RAM;
  // se pierde al reiniciar el servidor (suficiente para este caso de uso)
  const sessionService = new InMemorySessionService()

  // Runner es el ejecutor del pipeline; conecta el agente raíz con la sesión
  const runner = new Runner({
    appName: 'travel-planner',
    agent: travelPipeline,
    sessionService,
  })

  return { runner, sessionService }
}
