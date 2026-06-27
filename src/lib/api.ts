/**
 * api.ts — Cliente HTTP/SSE para el backend ADK Travel Planner.
 *
 * La función planTrip():
 *  1. Envía el TravelRequest al endpoint POST /api/plan del servidor Express.
 *  2. Lee la respuesta como un stream de Server-Sent Events (SSE).
 *  3. Por cada evento 'agent_update' llama al callback onAgentUpdate, lo que
 *     actualiza las AgentCard en tiempo real en App.tsx.
 *  4. Cuando llega el evento 'complete' resuelve la promesa con el TravelPlan.
 *  5. Si llega el evento 'error' o el stream termina inesperadamente, rechaza.
 *
 * Se usa la Fetch API + ReadableStream en lugar de EventSource porque
 * EventSource no soporta POST ni headers personalizados.
 */

import type { TravelRequest, AgentState, TravelPlan } from './types'

// URL base del servidor; se puede sobreescribir con la variable de entorno VITE_SERVER_URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

export function planTrip(
  request: TravelRequest,
  onAgentUpdate: (agent: AgentState) => void
): Promise<TravelPlan> {
  // Labels para mostrar en UI; el servidor solo envía la clave corta (ej. 'flight')
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

        // Lectura manual del ReadableStream para procesar SSE chunk a chunk
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = '' // Acumula datos parciales entre chunks

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              // El stream cerró antes de recibir el evento 'complete'
              reject(new Error('Stream ended unexpectedly'))
              return
            }

            // Decodifica el chunk y lo añade al buffer
            buffer += decoder.decode(value, { stream: true })

            // Los mensajes SSE están delimitados por líneas dobles (\n\n)
            const parts = buffer.split('\n\n')
            // El último elemento puede estar incompleto; se conserva en el buffer
            buffer = parts.pop() ?? ''

            for (const part of parts) {
              for (const line of part.split('\n')) {
                if (!line.startsWith('data: ')) continue
                try {
                  // Parsea el JSON que viene después de 'data: '
                  const data = JSON.parse(line.slice(6)) as
                    | { type: 'agent_update'; agent: string; status: 'working' | 'done' | 'error'; output?: string }
                    | { type: 'complete'; plan: TravelPlan }
                    | { type: 'error'; message: string }

                  if (data.type === 'agent_update') {
                    // Actualiza el estado de la tarjeta del agente correspondiente
                    const agentName = data.agent as AgentState['name']
                    onAgentUpdate({
                      name: agentName,
                      label: AGENT_LABELS[agentName] ?? agentName,
                      status: data.status,
                      output: data.output,
                    })
                  } else if (data.type === 'complete') {
                    // El pipeline terminó: entrega el plan completo al caller
                    resolve(data.plan)
                  } else if (data.type === 'error') {
                    reject(new Error(data.message))
                  }
                } catch {
                  // Línea SSE malformada o vacía; se ignora de forma segura
                }
              }
            }

            // Continúa leyendo el siguiente chunk
            return pump()
          })
        }

        return pump()
      })
      .catch(reject)
  })
}
