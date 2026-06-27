/**
 * types.ts — Tipos compartidos entre el frontend y la lógica de negocio.
 *
 * Estos tipos modelan el flujo completo de la aplicación:
 *   TravelRequest  →  enviado al backend por el usuario
 *   AgentState     →  estado en tiempo real de cada agente ADK
 *   TravelPlan     →  respuesta final del pipeline multi-agente
 */

/** Posibles estados de un agente ADK durante el procesamiento */
export type AgentStatus = 'idle' | 'working' | 'done' | 'error'

/** Identificadores únicos de los 4 agentes del pipeline */
export type AgentName = 'flight' | 'hotel' | 'activity' | 'itinerary'

/**
 * Estado observable de un agente ADK individual.
 * Se actualiza en tiempo real vía eventos SSE desde el servidor.
 */
export interface AgentState {
  name: AgentName
  label: string          // Nombre legible para mostrar en UI
  status: AgentStatus
  output?: string        // Texto generado por el LLM (disponible cuando status = 'done')
}

/**
 * Datos del viaje ingresados por el usuario en TravelForm.
 * Se envían al backend como body del POST /api/plan.
 */
export interface TravelRequest {
  origin: string
  destination: string
  duration: number          // En días
  budget: 'low' | 'medium' | 'high'
}

/**
 * Resultado final del pipeline ADK multi-agente.
 * Cada campo corresponde al outputKey de un LlmAgent específico.
 * El contenido es Markdown generado por el LLM.
 */
export interface TravelPlan {
  flights: string      // Generado por flight_agent
  hotels: string       // Generado por hotel_agent
  activities: string   // Generado por activity_agent
  itinerary: string    // Generado por itinerary_agent (consolida los tres anteriores)
}
