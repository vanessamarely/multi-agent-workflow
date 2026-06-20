# Multi-Agent Architecture Guide

## Overview

This application implements a **Google ADK-inspired multi-agent system** for travel planning. While it runs in the browser using Spark's LLM API instead of a Node.js backend with Google ADK, the architecture mirrors the ADK's agent pattern philosophy.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MultiAgentOrchestrator                    │
│  (Entry point that coordinates the entire workflow)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │       ParallelAgent<T, R>      │
         │  (Executes agents concurrently) │
         └──────┬────────┬────────┬───────┘
                │        │        │
      ┌─────────┘        │        └─────────┐
      │                  │                  │
      ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Flight  │      │  Hotel   │      │ Activity │
│  Agent   │      │  Agent   │      │  Agent   │
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │
     │    (All complete in parallel)     │
     │                 │                 │
     └─────────────────┼─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Itinerary      │
              │  Agent          │
              │  (Synthesizes)  │
              └────────┬────────┘
                       │
                       ▼
               ┌───────────────┐
               │  Travel Plan  │
               └───────────────┘
```

## Core Classes

### BaseAgent (Abstract)

The foundation for all agents in the system.

```typescript
abstract class BaseAgent {
  protected name: AgentName
  protected label: string
  protected onUpdate: AgentUpdateCallback

  constructor(name, label, onUpdate) {
    // Initialize agent with identity and callback
  }

  protected updateStatus(status, output?) {
    // Broadcast state changes to UI
    this.onUpdate({ name, label, status, output })
  }

  abstract execute(input: any): Promise<string>
}
```

**Key responsibilities:**
- Maintain agent identity (`name`, `label`)
- Handle status broadcasting via callbacks
- Define contract for execution (`execute` method)

### Specialized Research Agents

Each agent is responsible for a specific domain of travel planning.

#### FlightAgent

```typescript
class FlightAgent extends BaseAgent {
  constructor(onUpdate) {
    super('flight', 'Flight Agent', onUpdate)
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')
    
    // Construct specialized prompt for flight research
    const prompt = spark.llmPrompt`...flight-specific instructions...`
    const result = await spark.llm(prompt, 'gpt-4o-mini')
    
    this.updateStatus('done', result)
    return result
  }
}
```

**Produces:** Flight options, airlines, routes, costs, booking tips

#### HotelAgent

```typescript
class HotelAgent extends BaseAgent {
  constructor(onUpdate) {
    super('hotel', 'Hotel Agent', onUpdate)
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')
    
    const prompt = spark.llmPrompt`...hotel-specific instructions...`
    const result = await spark.llm(prompt, 'gpt-4o-mini')
    
    this.updateStatus('done', result)
    return result
  }
}
```

**Produces:** Accommodation recommendations, neighborhoods, amenities, pricing

#### ActivityAgent

```typescript
class ActivityAgent extends BaseAgent {
  constructor(onUpdate) {
    super('activity', 'Activity Agent', onUpdate)
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')
    
    const prompt = spark.llmPrompt`...activity-specific instructions...`
    const result = await spark.llm(prompt, 'gpt-4o-mini')
    
    this.updateStatus('done', result)
    return result
  }
}
```

**Produces:** Attractions, restaurants, experiences, local tips, estimated costs

### Synthesis Agent

#### ItineraryAgent

```typescript
class ItineraryAgent extends BaseAgent {
  constructor(onUpdate) {
    super('itinerary', 'Itinerary Agent', onUpdate)
  }

  async execute(input: { request, results }): Promise<string> {
    this.updateStatus('working')
    
    // Receives output from all three research agents
    const { flights, hotels, activities } = results
    
    // Synthesize into day-by-day itinerary
    const prompt = spark.llmPrompt`...synthesis instructions with all agent outputs...`
    const result = await spark.llm(prompt, 'gpt-4o')
    
    this.updateStatus('done', result)
    return result
  }
}
```

**Produces:** Comprehensive day-by-day travel plan integrating all research

### Coordination Agents

#### ParallelAgent

Executes multiple agents concurrently (Google ADK pattern).

```typescript
class ParallelAgent<T, R> {
  private agents: BaseAgent[]

  constructor(agents: BaseAgent[]) {
    this.agents = agents
  }

  async execute(input: T): Promise<R[]> {
    // Execute all agents simultaneously
    const results = await Promise.all(
      this.agents.map((agent) => agent.execute(input))
    )
    return results as R[]
  }
}
```

**Why this matters:**
- Reduces total execution time by 3x
- All agents receive the same input (TravelRequest)
- Returns array of results once ALL agents complete

**Time comparison:**
- Sequential: 8s + 8s + 8s = 24 seconds
- Parallel: max(8s, 8s, 8s) = 8 seconds ⚡

#### SequentialAgent

Chains agents where output of one feeds into the next.

```typescript
class SequentialAgent<T, R> {
  private agents: BaseAgent[]

  constructor(agents: BaseAgent[]) {
    this.agents = agents
  }

  async execute(input: T): Promise<R> {
    let currentInput: any = input

    for (const agent of this.agents) {
      const result = await agent.execute(currentInput)
      currentInput = result  // Output becomes next input
    }

    return currentInput as R
  }
}
```

**Use case:** When agents have dependencies (agent B needs agent A's output)

### Main Orchestrator

#### MultiAgentOrchestrator

The top-level coordinator that wires everything together.

```typescript
class MultiAgentOrchestrator {
  private onUpdate: AgentUpdateCallback

  constructor(onUpdate) {
    this.onUpdate = onUpdate
  }

  async executePlan(request: TravelRequest): Promise<TravelPlan> {
    // 1. Instantiate all agents with status callback
    const flightAgent = new FlightAgent(this.onUpdate)
    const hotelAgent = new HotelAgent(this.onUpdate)
    const activityAgent = new ActivityAgent(this.onUpdate)
    const itineraryAgent = new ItineraryAgent(this.onUpdate)

    // 2. Create parallel coordinator for research agents
    const parallelAgent = new ParallelAgent<TravelRequest, string>([
      flightAgent,
      hotelAgent,
      activityAgent,
    ])

    // 3. Execute parallel research phase
    const [flights, hotels, activities] = await parallelAgent.execute(request)

    // 4. Execute synthesis phase
    const itinerary = await itineraryAgent.execute({
      request,
      results: { flights, hotels, activities },
    })

    // 5. Return complete travel plan
    return { flights, hotels, activities, itinerary }
  }
}
```

## Execution Flow

### Step-by-Step Breakdown

1. **User submits travel request**
   ```typescript
   {
     destination: "Tokyo, Japan",
     duration: 7,
     budget: "medium"
   }
   ```

2. **Orchestrator initializes agents**
   - Creates instances of all 4 agents
   - Passes status callback to each
   - All agents start in `idle` state

3. **Parallel research phase begins**
   ```
   ParallelAgent.execute(request)
     ├─> FlightAgent.execute(request)  → status: 'working'
     ├─> HotelAgent.execute(request)   → status: 'working'
     └─> ActivityAgent.execute(request) → status: 'working'
   ```

4. **Agents work concurrently**
   - Each agent constructs specialized prompt
   - Each calls `spark.llm()` with their prompt
   - UI shows all three agents in "working" state simultaneously

5. **Agents complete (in any order)**
   ```
   FlightAgent   → status: 'done', output: "..." (8.2s)
   ActivityAgent → status: 'done', output: "..." (8.5s)
   HotelAgent    → status: 'done', output: "..." (8.7s)
   ```
   
   Total time: 8.7s (not 25.4s!)

6. **Synthesis phase begins**
   ```
   ItineraryAgent.execute({
     request: {...},
     results: { flights, hotels, activities }
   })
   ```
   
   - Status: 'working'
   - Receives all three research outputs
   - Creates comprehensive day-by-day plan

7. **Final plan delivered**
   ```
   ItineraryAgent → status: 'done', output: "..." (10.3s)
   ```
   
   Total elapsed time: 8.7s + 10.3s = **19 seconds**

8. **UI renders complete plan**
   - Flights section
   - Hotels section
   - Activities section
   - Day-by-day itinerary with all details

## Status Flow

Each agent transitions through states that are broadcast to the UI:

```
idle → working → done
         ↓
       error (if exception occurs)
```

**Status callback mechanism:**

```typescript
// In App.tsx
const handleAgentUpdate = (agent: AgentState) => {
  setAgents((prev) => ({
    ...prev,
    [agent.name]: agent,
  }))
}

// Agent calls this internally
this.onUpdate({
  name: 'flight',
  label: 'Flight Agent',
  status: 'working',
  output: undefined
})
```

This creates real-time visual feedback in the UI as agents progress.

## Comparison: Spark vs Google ADK

| Aspect | Spark Implementation | Google ADK Implementation |
|--------|---------------------|---------------------------|
| **Base Agent** | `abstract class BaseAgent` | `LlmAgent` from @google/adk |
| **Parallel Execution** | `ParallelAgent` with `Promise.all()` | `ParallelAgent` from @google/adk |
| **Sequential Execution** | `SequentialAgent` with for-loop | `SequentialAgent` from @google/adk |
| **LLM Calls** | `spark.llm(prompt, model)` | Gemini via ADK config |
| **Status Updates** | Callback functions | Event system / WebSocket |
| **Backend** | None (browser-only) | Node.js + Express |
| **Session Management** | None | `InMemorySessionService` |

## Key Design Patterns

### 1. Template Method Pattern

`BaseAgent` defines the structure (`execute`), concrete agents implement details.

### 2. Strategy Pattern

Each specialized agent encapsulates different research strategies (flights, hotels, activities).

### 3. Observer Pattern

Agents broadcast status changes via callbacks that the UI observes.

### 4. Dependency Injection

The `onUpdate` callback is injected into agents, decoupling them from UI.

### 5. Fan-Out/Fan-In

`ParallelAgent` fans out work to multiple agents, then fans in results.

## Performance Benefits

### Parallel Execution Impact

**Without parallelization (sequential):**
```
FlightAgent:   8 seconds
HotelAgent:    8 seconds
ActivityAgent: 8 seconds
----------------------------
Research total: 24 seconds

ItineraryAgent: 10 seconds
----------------------------
Grand total: 34 seconds
```

**With parallelization (ParallelAgent):**
```
FlightAgent   ┐
HotelAgent    ├─ max(8, 8, 8) = 8 seconds
ActivityAgent ┘
----------------------------
Research total: 8 seconds

ItineraryAgent: 10 seconds
----------------------------
Grand total: 18 seconds
```

**Speedup: 1.89x (47% faster)**

### Why This Works

1. **Independent research tasks** - Agents don't depend on each other's output
2. **I/O-bound operations** - Waiting for LLM API responses
3. **JavaScript concurrency** - `Promise.all()` handles concurrent async operations
4. **User experience** - Visual feedback shows all agents working simultaneously

## Extending the System

### Adding a New Agent

1. **Create agent class:**
```typescript
class WeatherAgent extends BaseAgent {
  constructor(onUpdate) {
    super('weather', 'Weather Agent', onUpdate)
  }

  async execute(request: TravelRequest): Promise<string> {
    this.updateStatus('working')
    
    const prompt = spark.llmPrompt`Analyze weather for ${request.destination} during the trip...`
    const result = await spark.llm(prompt, 'gpt-4o-mini')
    
    this.updateStatus('done', result)
    return result
  }
}
```

2. **Add to orchestrator:**
```typescript
const weatherAgent = new WeatherAgent(this.onUpdate)

const parallelAgent = new ParallelAgent<TravelRequest, string>([
  flightAgent,
  hotelAgent,
  activityAgent,
  weatherAgent,  // Add here
])

const [flights, hotels, activities, weather] = await parallelAgent.execute(request)
```

3. **Update types:**
```typescript
export interface TravelPlan {
  flights: string
  hotels: string
  activities: string
  weather: string     // Add here
  itinerary: string
}
```

### Creating Agent Hierarchies

You can nest coordinators for complex workflows:

```typescript
// Research phase
const researchAgent = new ParallelAgent([
  flightAgent,
  hotelAgent,
  activityAgent,
])

// Planning phase  
const planningAgent = new ParallelAgent([
  packingAgent,
  budgetAgent,
])

// Complete pipeline
const fullOrchestrator = new SequentialAgent([
  researchAgent,    // All research in parallel
  planningAgent,    // All planning in parallel
  itineraryAgent,   // Final synthesis
])
```

## Best Practices

### 1. Keep Agents Focused

Each agent should have a single, clear responsibility.

✅ Good: `FlightAgent` only handles flight research
❌ Bad: `TravelAgent` tries to do everything

### 2. Make Agents Stateless

Agents should not maintain internal state between executions.

✅ Good: Pass all data via `execute(input)`
❌ Bad: Store previous requests in agent instance

### 3. Use Appropriate Models

Match model capability to task complexity:

- **gpt-4o-mini**: Fast, cost-effective for research agents
- **gpt-4o**: More capable for complex synthesis (ItineraryAgent)

### 4. Handle Errors Gracefully

```typescript
async execute(input) {
  this.updateStatus('working')
  
  try {
    const result = await spark.llm(prompt)
    this.updateStatus('done', result)
    return result
  } catch (error) {
    this.updateStatus('error')
    throw error
  }
}
```

### 5. Provide Rich Status Updates

Include partial output for long-running operations:

```typescript
this.updateStatus('done', result.substring(0, 150) + '...')
```

## Conclusion

This multi-agent architecture demonstrates:

- ✅ **Clear separation of concerns** (each agent has one job)
- ✅ **Parallel execution** for performance (3x speedup)
- ✅ **Real-time feedback** through status callbacks
- ✅ **Extensibility** (easy to add new agents)
- ✅ **Type safety** with TypeScript interfaces
- ✅ **Google ADK patterns** adapted for browser environment

The system mirrors professional multi-agent frameworks while working entirely in the browser using Spark's capabilities.
