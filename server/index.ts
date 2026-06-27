/**
 * Travel Planner Backend Server
 *
 * Exposes a single SSE endpoint:
 *   POST /api/plan
 *
 * The endpoint runs the ADK multi-agent workflow and streams
 * real-time agent status updates + final results to the frontend
 * using Server-Sent Events (SSE).
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

type SSEEvent =
  | { type: 'agent_update'; agent: string; status: 'working' | 'done' | 'error'; output?: string }
  | { type: 'complete'; plan: { flights: string; hotels: string; activities: string; itinerary: string } }
  | { type: 'error'; message: string }

function sendSSE(res: Response, data: SSEEvent) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

// Maps ADK agent name → frontend key AND session state key (outputKey)
const AGENT_KEY_MAP: Record<string, string> = {
  flight_agent: 'flight',
  hotel_agent: 'hotel',
  activity_agent: 'activity',
  itinerary_agent: 'itinerary',
}

// Maps ADK agent name → the outputKey they write into session state
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
  // ── SSE headers ──────────────────────────────
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

  const budgetGuide: Record<string, string> = {
    low: 'economy/budget — prioritize affordable options',
    medium: 'mid-range — balance comfort and value',
    high: 'premium — prioritize quality and luxury',
  }

  const userMessage = `Plan a ${duration}-day trip from ${origin} to ${destination}. Budget level: ${budget} (${budgetGuide[budget] ?? budget}).`

  try {
    const { runner, sessionService } = createTravelRunner()
    const sessionId = crypto.randomUUID()
    const userId = 'traveler'

    await sessionService.createSession({
      appName: 'travel-planner',
      userId,
      sessionId,
    })

    const agentOutputs: Record<string, string> = {}
    const seenAgents = new Set<string>()
    // Accumulate text content per agent across events,
    // since the isFinalResponse event may be a state-update event with no text.
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

      // First event from this agent → signal it's working
      if (!seenAgents.has(author)) {
        seenAgents.add(author)
        sendSSE(res, { type: 'agent_update', agent: agentKey, status: 'working' })
      }

      // Accumulate any text content emitted by this agent.
      // ADK LlmAgents with outputKey store their response in
      // event.actions.stateDelta[outputKey] rather than event.content.
      // Check both sources so we capture the text regardless of which
      // event carries it.
      const textFromContent = stringifyContent(event)
      if (textFromContent) {
        agentTextBuffers[agentKey] = textFromContent
      }

      // Also check the stateDelta for the outputKey value
      const outputKey = AGENT_OUTPUT_KEY[author]
      if (outputKey) {
        const deltaText = event.actions?.stateDelta?.[outputKey]
        if (deltaText && typeof deltaText === 'string') {
          agentTextBuffers[agentKey] = deltaText
        }
      }

      // Final response from this agent → signal done + send buffered output.
      // If the event contains an error, emit 'error' status instead.
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

    // ── Read parallel-agent results from session state ───
    // outputKey stores the text in session state; use it as fallback
    // if the event stream didn't surface the text.
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

    // Re-emit done events for parallel agents if their output was only
    // in session state (empty in agentOutputs but present in stateOutputs).
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
