import { TravelRequest } from '../types'
import { ParallelAgent } from './ParallelAgentV2'
import { BaseAgent } from './base'

export interface SequentialAgentConfig {
  name: string
  subAgents: (BaseAgent | ParallelAgent)[]
}

export class SequentialAgent {
  private name: string
  private subAgents: (BaseAgent | ParallelAgent)[]

  constructor(config: SequentialAgentConfig) {
    this.name = config.name
    this.subAgents = config.subAgents
  }

  async execute(request: TravelRequest): Promise<Record<string, string>> {
    let context: Record<string, string> = {}

    for (const agent of this.subAgents) {
      if (agent instanceof ParallelAgent) {
        const parallelResults = await agent.execute(request)
        context = { ...context, ...parallelResults }
      } else {
        const result = await agent.execute(request, context)
        context[agent.getName()] = result
      }
    }

    return context
  }

  getName(): string {
    return this.name
  }
}
