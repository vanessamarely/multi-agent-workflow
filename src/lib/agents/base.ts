import { GenerativeModel } from '@google/generative-ai'
import { TravelRequest } from '../types'

export interface BaseAgentConfig {
  name: string
  description: string
  model: GenerativeModel
  onStatusChange?: (status: 'idle' | 'working' | 'done' | 'error') => void
}

export abstract class BaseAgent {
  protected name: string
  protected description: string
  protected model: GenerativeModel
  protected onStatusChange?: (status: 'idle' | 'working' | 'done' | 'error') => void

  constructor(config: BaseAgentConfig) {
    this.name = config.name
    this.description = config.description
    this.model = config.model
    this.onStatusChange = config.onStatusChange
  }

  protected updateStatus(status: 'idle' | 'working' | 'done' | 'error') {
    if (this.onStatusChange) {
      this.onStatusChange(status)
    }
  }

  abstract execute(request: TravelRequest, context?: Record<string, string>): Promise<string>

  getName(): string {
    return this.name
  }

  getDescription(): string {
    return this.description
  }
}
