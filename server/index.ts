/**
 * server/index.ts — Servidor Express del ADK Travel Planner.
 *
 * Expone un único endpoint SSE:
 *   POST /api/plan
 *
 * Flujo completo:
 *  1. Recibe el TravelRequest (origin, destination, duration, budget) en el body.
 *  2. Valida que todos los campos estén presentes.
 *  3. Crea una sesión ADK única (UUID) para aislar el estado de cada petición.
 *  4. Construye el mensaje del usuario y ejecuta el pipeline SequentialAgent.
 *  5. Por cada evento del stream ADK mapea el agente y emite un SSE al cliente:
 *       - Primer evento del agente    → { type: 'agent_update', status: 'working' }
 *       - isFinalResponse del agente  → { type: 'agent_update', status: 'done', output }
 *  6. Al terminar el pipeline lee el estado de sesión como fallback
 *     (los agentes paralelos a veces sólo escriben en stateDelta, no en content).
 *  7. Emite { type: 'complete', plan } y cierra el stream con res.end().
 */

import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { isFinalResponse, stringifyContent } from '@google/adk'
import { createTravelRunner } from './travel-orchestrator.js'

// ──────────────────────────────────────────────
// Validate environment
// ──────────────────────────────────────────────

// La API key de Gemini es requerida; el ADK la lee directamente de process.env.
// dotenv/config (importado arriba) ya cargó el archivo .env antes de llegar aquí.
const API_KEY = process.env.GEMINI_API_KEY
if (!API_KEY) {
  console.error(
    'ERROR: GEMINI_API_KEY is not set. Add it to your .env file.'
  )
  process.exit(1)
}

// ADK reads GEMINI_API_KEY or GOOGLE_GENAI_API_KEY from process.env.
// dotenv/config (imported above) already loaded the .env file, so the
// variable is available at this point.

// ──────────────────────────────────────────────
// SSE helper
// ──────────────────────────────────────────────

// Tipo discriminado de los eventos SSE que este servidor puede emitir
type SSEEvent =
  | { type: 'agent_update'; agent: string; status: 'working' | 'done' | 'error'; output?: string }
  | { type: 'complete'; plan: { flights: string; hotels: string; activities: string; itinerary: string } }
  | { type: 'error'; message: string }

/** Serializa y escribe un evento SSE en el response stream */
function sendSSE(res: Response, data: SSEEvent) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

// Mapea el nombre del agente en ADK al identificador corto usado en el frontend
const AGENT_KEY_MAP: Record<string, string> = {
  flight_agent: 'flight',
  hotel_agent: 'hotel',
  activity_agent: 'activity',
  itinerary_agent: 'itinerary',
}

// Mapea el nombre del agente ADK a la clave de outputKey que usa para guardar
// su resultado en el estado de sesión (usado como fallback en la lectura final)
const AGENT_OUTPUT_KEY: Record<string, string> = {
  flight_agent: 'flight_results',
  hotel_agent: 'hotel_results',
  activity_agent: 'activity_results',
  itinerary_agent: 'itinerary_results',
}

// ──────────────────────────────────────────────
// Express app
// ──────────────────────────────────────────────

const app = express()
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/**
 * POST /api/plan
 *
 * Body: { origin: string, destination: string, duration: number, budget: 'low' | 'medium' | 'high' }
 *
 * Streams SSE events:
 *   { type: 'agent_update', agent: 'flight'|'hotel'|'activity'|'itinerary', status: 'working'|'done', output?: string }
 *   { type: 'complete', plan: { flights, hotels, activities, itinerary } }
 *   { type: 'error', message: string }
 */
app.post('/api/plan', async (req: Request, res: Response) => {
  // ── Cabeceras SSE ────────────────────────────
  // Indica al cliente que la respuesta es un stream continuo de eventos;
  // 'no-cache' evita que proxies almacenen el stream en buffer.
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering if present
  res.flushHeaders()

  const { origin, destination, duration, budget } = req.body as {
    origin?: string
    destination?: string
    duration?: number
    budget?: string
  }

  if (!origin || !destination || !duration || !budget) {
    sendSSE(res, { type: 'error', message: 'Missing required fields: origin, destination, duration, budget' })
    res.end()
    return
  }

  // Texto descriptivo del presupuesto que se incluye en el prompt al LLM
  const budgetGuide: Record<string, string> = {
    low: 'economy/budget — prioritize affordable options',
    medium: 'mid-range — balance comfort and value',
    high: 'premium — prioritize quality and luxury',
  }

  // Mensaje que recibirán todos los agentes como contexto inicial del viaje
  const userMessage = `Plan a ${duration}-day trip from ${origin} to ${destination}. Budget level: ${budget} (${budgetGuide[budget] ?? budget}).`

  try {
    const { runner, sessionService } = createTravelRunner()
    const sessionId = crypto.randomUUID()  // Sesión única por petición HTTP
    const userId = 'traveler'

    // Crea la sesión en memoria; ADK la usa para pasar datos entre agentes
    await sessionService.createSession({
      appName: 'travel-planner',
      userId,
      sessionId,
    })

    const agentOutputs: Record<string, string> = {}   // Outputs capturados desde el stream
    const seenAgents = new Set<string>()               // Evita emitir 'working' más de una vez
    // Acumula texto por agente porque el evento isFinalResponse puede no tener content
    const agentTextBuffers: Record<string, string> = {}

    // ── Stream ADK events ────────────────────────
    for await (const event of runner.runAsync({
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    })) {
      const author = event.author
      if (!author) continue

      const agentKey = AGENT_KEY_MAP[author]
      if (!agentKey) continue

      // Primer evento de este agente → notificar al frontend que empezó a trabajar
      if (!seenAgents.has(author)) {
        seenAgents.add(author)
        sendSSE(res, { type: 'agent_update', agent: agentKey, status: 'working' })
      }

      // Acumula texto del contenido del evento.
      // Los LlmAgents con outputKey guardan su respuesta en
      // event.actions.stateDelta[outputKey] en vez de event.content;
      // se comprueba ambas fuentes para cubrir los dos casos.
      const textFromContent = stringifyContent(event)
      if (textFromContent) {
        agentTextBuffers[agentKey] = textFromContent
      }

      // Comprueba también el stateDelta con el outputKey del agente
      const outputKey = AGENT_OUTPUT_KEY[author]
      if (outputKey) {
        const deltaText = event.actions?.stateDelta?.[outputKey]
        if (deltaText && typeof deltaText === 'string') {
          agentTextBuffers[agentKey] = deltaText
        }
      }

      // Respuesta final del agente → emitir 'done' con el texto acumulado.
      // Si el evento trae errorCode, emitir 'error' en su lugar.
      if (isFinalResponse(event)) {
        if (event.errorCode) {
          sendSSE(res, {
            type: 'agent_update',
            agent: agentKey,
            status: 'error',
            output: event.errorMessage ?? 'Agent error',
          })
        } else {
          const output = agentTextBuffers[agentKey] ?? ''
          agentOutputs[agentKey] = output
          sendSSE(res, { type: 'agent_update', agent: agentKey, status: 'done', output })
        }
      }
    }

    // ── Lectura de resultados desde el estado de sesión (fallback) ───────────
    // Los agentes paralelos a veces sólo dejan su output en session.state
    // vía outputKey, sin incluirlo en event.content. Se lee el estado final
    // como fuente de verdad complementaria.
    const session = await sessionService.getSession({
      appName: 'travel-planner',
      userId,
      sessionId,
    })

    const state = session?.state ?? {}

    const stateOutputs = {
      flights:
        agentOutputs['flight'] ||
        ((state['flight_results'] as string | undefined) ?? ''),
      hotels:
        agentOutputs['hotel'] ||
        ((state['hotel_results'] as string | undefined) ?? ''),
      activities:
        agentOutputs['activity'] ||
        ((state['activity_results'] as string | undefined) ?? ''),
      itinerary:
        agentOutputs['itinerary'] ||
        ((state['itinerary_results'] as string | undefined) ?? ''),
    }

    // Re-emite eventos 'done' para los agentes paralelos cuyo output
    // solo estaba en session state (agentOutputs vacío pero stateOutputs con contenido)
    for (const [key, stateKey] of [
      ['flight', 'flights'],
      ['hotel', 'hotels'],
      ['activity', 'activities'],
    ] as const) {
      if (!agentOutputs[key] && stateOutputs[stateKey]) {
        sendSSE(res, {
          type: 'agent_update',
          agent: key,
          status: 'done',
          output: stateOutputs[stateKey],
        })
      }
    }

    // ── Send complete plan ───────────────────────
    sendSSE(res, {
      type: 'complete',
      plan: stateOutputs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ADK Error]', message)
    sendSSE(res, { type: 'error', message })
  } finally {
    res.end()
  }
})

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, () => {
  console.log(`\n🤖 ADK Travel Planner Server running at http://localhost:${PORT}`)
  console.log(`   POST http://localhost:${PORT}/api/plan\n`)
})
