import { BaseAgent } from './BaseAgent'

export class ParallelAgent<T, R> {
  private agents: BaseAgent[]

  constructor(agents: BaseAgent[]) {
    this.agents = agents
  }

  async execute(input: T): Promise<R[]> {
    const results = await Promise.all(
      this.agents.map((agent) => agent.execute(input))
    )
    return results as R[]
  }
}
