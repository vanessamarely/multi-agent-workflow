import { BaseAgent } from './BaseAgent'

export class SequentialAgent<T, R> {
  private agents: BaseAgent[]

  constructor(agents: BaseAgent[]) {
    this.agents = agents
  }

  async execute(input: T): Promise<R> {
    let currentInput: any = input

    for (const agent of this.agents) {
      const result = await agent.execute(currentInput)
      currentInput = result
    }

    return currentInput as R
  }
}
