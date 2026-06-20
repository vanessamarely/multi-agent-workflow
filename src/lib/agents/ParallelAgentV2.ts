import { BaseAgent } from './base'
import { TravelRequest } from '../types'

export interface ParallelAgentConfig {
  name: string
  subAgents: BaseAgent[]
  onStatusChange?: (agentName: string, status: 'idle' | 'working' | 'done' | 'error') => void
}

export class ParallelAgent {
  private name: string
  private subAgents: BaseAgent[]
  private onStatusChange?: (agentName: string, status: 'idle' | 'working' | 'done' | 'error') => void

  constructor(config: ParallelAgentConfig) {
    this.name = config.name
    this.subAgents = config.subAgents
    this.onStatusChange = config.onStatusChange
  }

  async execute(request: TravelRequest): Promise<Record<string, string>> {
    const results = await Promise.all(
      this.subAgents.map(agent => agent.execute(request))
    )

    const output: Record<string, string> = {}
    this.subAgents.forEach((agent, index) => {
      output[agent.getName()] = results[index]
    })

    return output
  }

  getName(): string {
    return this.name
  }
}
