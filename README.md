# AI Travel Planner - Google ADK Multi-Agent System

A multi-agent AI travel planning application built using **Google Gemini API** with **ADK-inspired orchestration patterns** (ParallelAgent + SequentialAgent). Watch specialized AI agents collaborate in real-time to create comprehensive travel itineraries.

## Architecture

This application demonstrates Google's Agent Development Kit (ADK) design patterns:

```
User Input
    ↓
SequentialAgent (travelPipeline)
    ↓
ParallelAgent (researchTeam)  ← 3 agents run SIMULTANEOUSLY
    ├─ FlightAgent (Gemini 1.5 Flash)
    ├─ HotelAgent (Gemini 1.5 Flash)
    └─ ActivityAgent (Gemini 1.5 Flash)
    ↓
ItineraryAgent (Gemini 1.5 Pro)  ← Synthesizes all inputs
    ↓
Complete Travel Plan
```

### Why Google ADK Patterns?

**ParallelAgent** runs the three research agents (Flight, Hotel, Activity) concurrently, reducing total response time from 15-20 seconds (sequential) to ~5-7 seconds.

**SequentialAgent** ensures the itinerary agent receives complete context from all research agents before generating the final day-by-day plan.

## Features

- **Real-time Agent Visualization**: Watch each agent's status change from idle → working → done
- **Parallel Processing**: Flight, Hotel, and Activity agents run simultaneously
- **Context-Aware Synthesis**: Itinerary agent combines all outputs into a cohesive plan
- **Budget-Aware Recommendations**: Agents adapt suggestions based on low/medium/high budget
- **Responsive Design**: Works seamlessly on desktop and mobile

## Prerequisites

- Node.js 18+ and npm
- Google AI Studio API Key (free)

## Setup

### 1. Get Your Google AI Studio API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Get API Key"** or **"Create API Key"**
3. Copy your API key (starts with `AIza...`)

> **Note**: This uses Google AI Studio (free tier), not Vertex AI (which requires billing).

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual API key from step 1.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── AgentCard.tsx          # Visual representation of agent status
│   ├── TravelForm.tsx          # User input form
│   └── ItineraryViewer.tsx     # Displays final travel plan
├── lib/
│   ├── gemini-config.ts        # Gemini API configuration
│   ├── agents/
│   │   ├── base.ts             # BaseAgent abstract class
│   │   ├── FlightAgentV2.ts    # Flight research agent
│   │   ├── HotelAgentV2.ts     # Hotel research agent
│   │   ├── ActivityAgentV2.ts  # Activity research agent
│   │   ├── ItineraryAgentV2.ts # Itinerary synthesis agent
│   │   ├── ParallelAgentV2.ts  # ADK ParallelAgent pattern
│   │   ├── SequentialAgentV2.ts # ADK SequentialAgent pattern
│   │   └── GeminiMultiAgentOrchestrator.ts # Main orchestrator
│   └── types.ts                # TypeScript interfaces
└── App.tsx                     # Main application component
```

## How It Works

### 1. User Input

User provides:
- **Destination**: Where they want to travel
- **Duration**: Number of days (1-14)
- **Budget**: Low, Medium, or High

### 2. Parallel Research Phase

Three specialized agents run **simultaneously**:

- **FlightAgent**: Finds flight options, estimates costs, suggests airlines
- **HotelAgent**: Recommends accommodations, calculates lodging costs
- **ActivityAgent**: Suggests attractions, restaurants, and experiences

All three use **Gemini 1.5 Flash** for fast, cost-effective responses.

### 3. Sequential Synthesis Phase

Once all research agents complete, the **ItineraryAgent**:
- Receives combined output from all three agents
- Uses **Gemini 1.5 Pro** for higher-quality synthesis
- Generates a day-by-day itinerary with timing, logistics, and cost summary

### 4. Real-time UI Updates

The UI shows each agent's progress:
- **Idle** (gray): Agent hasn't started
- **Working** (animated blue border): Agent is processing
- **Done** (green check): Agent completed successfully
- **Error** (red X): Agent encountered an error

## Multi-Agent Orchestration Patterns

### ParallelAgent

Executes multiple agents concurrently using `Promise.all`:

```typescript
const researchTeam = new ParallelAgent({
  name: 'researchTeam',
  subAgents: [flightAgent, hotelAgent, activityAgent]
})

// All agents execute at the same time
const results = await researchTeam.execute(request)
```

**Performance**: Reduces total time by ~60-70% compared to sequential execution.

### SequentialAgent

Executes agents in order, passing context forward:

```typescript
const pipeline = new SequentialAgent({
  name: 'travelPipeline',
  subAgents: [researchTeam, itineraryAgent]
})

// researchTeam runs first, output becomes itineraryAgent's context
const results = await pipeline.execute(request)
```

**Benefits**: Ensures itinerary agent has complete information before synthesizing.

## Implementation Notes

This app uses **Google Gemini API** (`@google/generative-ai`) with **ADK-inspired patterns**:
- ✅ True multi-agent architecture with BaseAgent classes
- ✅ ParallelAgent and SequentialAgent orchestration patterns
- ✅ Agent state tracking and status callbacks
- ✅ Context passing between agents
- ✅ Production-ready, Google-backed API

The implementation follows Google's Agent Development Kit (ADK) design patterns for multi-agent orchestration, adapted for browser environments.

## Customization

### Change Models

Edit `src/lib/gemini-config.ts`:

```typescript
export const getFlashModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',  // Change model here
    generationConfig: {
      temperature: 0.7,  // Adjust creativity
      maxOutputTokens: 2048,  // Adjust response length
    }
  })
}
```

### Add New Agents

1. Create a new agent extending `BaseAgent`
2. Implement the `execute()` method
3. Add it to the ParallelAgent or SequentialAgent in the orchestrator

### Modify Agent Prompts

Each agent file (e.g., `FlightAgentV2.ts`) contains its own prompt. Edit the prompt string to change agent behavior.

## Troubleshooting

### "API Key Not Found"

Make sure:
1. `.env` file exists in project root
2. File contains `VITE_GEMINI_API_KEY=your_key`
3. You've restarted the dev server after creating `.env`

### "Failed to generate travel plan"

Common causes:
- Invalid or expired API key
- Rate limit exceeded (free tier has limits)
- Network connectivity issues

Check browser console for detailed error messages.

### Agents Stay in "Working" State

This usually means:
- API request timed out
- Invalid API key
- Model name typo in configuration

## Performance

- **Sequential Execution**: ~15-20 seconds
- **Parallel Execution (ADK Pattern)**: ~5-7 seconds
- **Speedup**: ~60-70% faster

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Google Gemini API (1.5 Flash + 1.5 Pro)
- **Architecture**: ADK-inspired multi-agent patterns
- **State Management**: React hooks
- **Icons**: Phosphor Icons
- **Notifications**: Sonner

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Multi-agent architecture guide
- [PRD.md](./PRD.md) - Product requirements document

## License

MIT

## Learn More

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google ADK Concepts](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-builder/introduction)
