# Architecture

## Overview

This project is a full-stack application split into two parts:

- **Backend** (`server/`) — Node.js process that runs the real Google ADK multi-agent workflow
- **Frontend** (`src/`) — React app that streams agent status from the backend and renders results

The key design decision is that **ADK runs exclusively on the backend**. The frontend never calls Gemini directly; it only reads the Server-Sent Events (SSE) stream produced by the ADK `Runner`.

---

## Backend — ADK Workflow (`server/travel-orchestrator.ts`)

### Agent hierarchy

```
SequentialAgent: travel_pipeline
├── ParallelAgent: research_team
│   ├── LlmAgent: flight_agent    (gemini-2.5-flash)  outputKey → "flight_results"
│   ├── LlmAgent: hotel_agent     (gemini-2.5-flash)  outputKey → "hotel_results"
│   └── LlmAgent: activity_agent  (gemini-2.5-flash)  outputKey → "activity_results"
└── LlmAgent: itinerary_agent     (gemini-2.5-pro)    outputKey → "itinerary_results"
```

### How agents share data — `outputKey` + session state

Each `LlmAgent` is configured with an `outputKey`. When the agent finishes, ADK automatically writes its response text into the session state under that key:

```typescript
const flightAgent = new LlmAgent({
  name: 'flight_agent',
  model: 'gemini-2.5-flash',
  instruction: 'You are a Flight Agent ...',
  outputKey: 'flight_results',   // ← ADK writes response to session state
})
```

The `itinerary_agent` uses an `InstructionProvider` function (instead of a static string) to read those session state values at runtime:

```typescript
const itineraryAgent = new LlmAgent({
  name: 'itinerary_agent',
  model: 'gemini-2.5-pro',
  instruction: (ctx: ReadonlyContext) => {
    const flights   = ctx.state.get<string>('flight_results')   ?? 'No data'
    const hotels    = ctx.state.get<string>('hotel_results')    ?? 'No data'
    const activities = ctx.state.get<string>('activity_results') ?? 'No data'
    return `Synthesize this into a day-by-day itinerary:\n\nFlights:\n${flights}\n...`
  },
  outputKey: 'itinerary_results',
})
```

### Workflow composition

```typescript
// 3 agents run concurrently (Promise.all internally)
const researchTeam = new ParallelAgent({
  name: 'research_team',
  subAgents: [flightAgent, hotelAgent, activityAgent],
})

// researchTeam runs first, then itineraryAgent
const travelPipeline = new SequentialAgent({
  name: 'travel_pipeline',
  subAgents: [researchTeam, itineraryAgent],
})
```

### Runner + session

```typescript
const runner = new Runner({
  appName: 'travel-planner',
  agent: travelPipeline,
  sessionService: new InMemorySessionService(),
})

for await (const event of runner.runAsync({ userId, sessionId, newMessage })) {
  // stream ADK events to the frontend via SSE
}
```

---

## Backend — HTTP Server (`server/index.ts`)

Express server that exposes a single endpoint:

```
POST /api/plan
Content-Type: application/json
{ destination, duration, budget }

Response: text/event-stream (SSE)
```

For each ADK event the runner yields, the server:

1. Identifies the agent via `event.author`
2. On first event from that agent → sends `{ type: "agent_update", status: "working" }`
3. On `isFinalResponse(event)` → reads text from `event.actions.stateDelta[outputKey]` and sends `{ type: "agent_update", status: "done", output }`
4. After all events finish → reads final outputs from session state and sends `{ type: "complete", plan: { flights, hotels, activities, itinerary } }`

---

## Frontend — React (`src/`)

### Data flow

```
App.tsx
  └── TravelForm  →  handleSubmit(request)
        └── planTrip(request, onAgentUpdate)   [src/lib/api.ts]
              └── fetch POST /api/plan
                    └── ReadableStream (SSE)
                          ├── agent_update events → setAgents()
                          └── complete event → setTravelPlan()
```

### SSE client (`src/lib/api.ts`)

Uses the `fetch` + `ReadableStream` API (not `EventSource`, which doesn't support POST):

```typescript
const response = await fetch(`${SERVER_URL}/api/plan`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
})

const reader = response.body!.getReader()
// pump() reads chunks, splits on "\n\n", parses "data: {...}" lines
```

### Component hierarchy

```
App.tsx
├── TravelForm.tsx        user input (destination, duration, budget)
├── AgentCard.tsx ×4      idle / working / done / error status per agent
├── TravelMap.tsx         destination map visualization
└── ItineraryViewer.tsx   renders the final travel plan
```

---

## Models

| Agent | Model | Reason |
|---|---|---|
| flight_agent | gemini-2.5-flash | Fast, parallel, cost-effective |
| hotel_agent | gemini-2.5-flash | Fast, parallel, cost-effective |
| activity_agent | gemini-2.5-flash | Fast, parallel, cost-effective |
| itinerary_agent | gemini-2.5-pro | Needs deeper reasoning for synthesis |

---

## ADK classes used

| Class | Package | Role |
|---|---|---|
| `LlmAgent` | `@google/adk` | Individual AI agent backed by a Gemini model |
| `ParallelAgent` | `@google/adk` | Runs sub-agents concurrently |
| `SequentialAgent` | `@google/adk` | Runs sub-agents in sequence |
| `Runner` | `@google/adk` | Executes the agent tree, yields events |
| `InMemorySessionService` | `@google/adk` | Stores session state in memory |
| `isFinalResponse` | `@google/adk` | Identifies the last event from an agent |
| `stringifyContent` | `@google/adk` | Extracts text from an event |
| `ReadonlyContext` | `@google/adk` | Gives agents read access to session state |


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

