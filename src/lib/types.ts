export type AgentStatus = 'idle' | 'working' | 'done' | 'error'

export type AgentName = 'flight' | 'hotel' | 'activity' | 'itinerary'

export interface AgentState {
  name: AgentName
  label: string
  status: AgentStatus
  output?: string
}

export interface TravelRequest {
  destination: string
  duration: number
  budget: 'low' | 'medium' | 'high'
}

export interface TravelPlan {
  flights: string
  hotels: string
  activities: string
  itinerary: string
}
