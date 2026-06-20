import { AgentState, AgentName } from '../types'

export type AgentUpdateCallback = (agent: AgentState) => void

export abstract class BaseAgent {
  protected name: AgentName
  protected label: string
  protected onUpdate: AgentUpdateCallback

  constructor(name: AgentName, label: string, onUpdate: AgentUpdateCallback) {
    this.name = name
    this.label = label
    this.onUpdate = onUpdate
  }

  protected updateStatus(status: AgentState['status'], output?: string) {
    this.onUpdate({
      name: this.name,
      label: this.label,
      status,
      output,
    })
  }

  abstract execute(input: any): Promise<string>
}
