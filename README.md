# AI Travel Planner — Google ADK Multi-Agent System

A full-stack travel planning application that demonstrates how to use **Google Agent Development Kit (ADK)** with **TypeScript** to build a real multi-agent workflow.

The frontend (React + Vite) connects to a Node.js backend that runs the actual ADK orchestration using `LlmAgent`, `ParallelAgent`, `SequentialAgent`, and `Runner` from `@google/adk`.

## Workflow

```
React Frontend  →  POST /api/plan (SSE)  →  Node.js Backend
                                                    │
                                         SequentialAgent: travel_pipeline
                                                    │
                                    ┌───────────────┴───────────────┐
                                    │                               │
                           ParallelAgent: research_team    LlmAgent: itinerary_agent
                           ┌────────┼────────┐              (gemini-2.5-pro)
                      flight_agent  │  hotel_agent
                    (gemini-2.5-flash) activity_agent
                                  (gemini-2.5-flash)
```

1. **ParallelAgent** runs `flight_agent`, `hotel_agent`, and `activity_agent` **concurrently** — each stores its result in ADK session state via `outputKey`.
2. **SequentialAgent** waits for the parallel phase to complete, then runs `itinerary_agent`.
3. **`itinerary_agent`** reads session state populated by the three research agents and synthesizes a day-by-day travel plan.

## Prerequisites

- Node.js 20+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Setup

### 1. Configure environment

Edit the `.env` file in the project root:

```env
# Used by the Node.js backend (ADK reads this directly)
GEMINI_API_KEY=your_api_key_here

# Tells the React frontend where the backend is running
VITE_SERVER_URL=http://localhost:3001
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run

Open **two terminals**:

```bash
# Terminal 1 — Node.js backend (ADK agents)
npm run server

# Terminal 2 — React frontend
npm run dev
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

## Project Structure

```
travel-planner-multi/
├── server/
│   ├── travel-orchestrator.ts   # ADK agents + workflow definition
│   └── index.ts                 # Express server with SSE endpoint
├── src/
│   ├── lib/
│   │   ├── api.ts               # Fetch-based SSE client
│   │   └── types.ts             # Shared TypeScript types
│   ├── components/
│   │   ├── AgentCard.tsx        # Agent status visualization
│   │   ├── TravelForm.tsx       # User input form
│   │   ├── ItineraryViewer.tsx  # Final travel plan display
│   │   └── TravelMap.tsx        # Destination map
│   └── App.tsx                  # Main React component
├── .env                         # API keys (not committed)
└── package.json
```

## API

### `POST /api/plan`

**Request body:**
```json
{ "destination": "Tokyo", "duration": 5, "budget": "medium" }
```

**Response:** SSE stream
```
data: {"type":"agent_update","agent":"flight","status":"working"}
data: {"type":"agent_update","agent":"flight","status":"done","output":"..."}
data: {"type":"agent_update","agent":"hotel","status":"working"}
...
data: {"type":"complete","plan":{"flights":"...","hotels":"...","activities":"...","itinerary":"..."}}
```


