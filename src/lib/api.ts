/**
 * API client for the ADK Travel Planner backend.
 *
 * Calls POST /api/plan and reads the Server-Sent Events stream
 * to deliver real-time agent status updates and the final plan.
 */

import type { TravelRequest, AgentState, TravelPlan } from './types'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

export function planTrip(
  request: TravelRequest,
  onAgentUpdate: (agent: AgentState) => void
): Promise<TravelPlan> {
  const AGENT_LABELS: Record<string, string> = {
    flight: 'Flight Agent',
    hotel: 'Hotel Agent',
    activity: 'Activity Agent',
    itinerary: 'Itinerary Agent',
  }

  return new Promise<TravelPlan>((resolve, reject) => {
    fetch(`${SERVER_URL}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }
        if (!response.body) {
          throw new Error('Response body is empty')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              // Stream ended without a 'complete' event
              reject(new Error('Stream ended unexpectedly'))
              return
            }

            buffer += decoder.decode(value, { stream: true })

            // SSE messages are separated by double newlines
            const parts = buffer.split('\n\n')
            // Keep the last (potentially incomplete) chunk in the buffer
            buffer = parts.pop() ?? ''

            for (const part of parts) {
              for (const line of part.split('\n')) {
                if (!line.startsWith('data: ')) continue
                try {
                  const data = JSON.parse(line.slice(6)) as
                    | { type: 'agent_update'; agent: string; status: 'working' | 'done' | 'error'; output?: string }
                    | { type: 'complete'; plan: TravelPlan }
                    | { type: 'error'; message: string }

                  if (data.type === 'agent_update') {
                    const agentName = data.agent as AgentState['name']
                    onAgentUpdate({
                      name: agentName,
                      label: AGENT_LABELS[agentName] ?? agentName,
                      status: data.status,
                      output: data.output,
                    })
                  } else if (data.type === 'complete') {
                    resolve(data.plan)
                  } else if (data.type === 'error') {
                    reject(new Error(data.message))
                  }
                } catch {
                  // Ignore malformed SSE lines
                }
              }
            }

            return pump()
          })
        }

        return pump()
      })
      .catch(reject)
  })
}
