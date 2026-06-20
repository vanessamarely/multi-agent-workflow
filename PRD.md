# Travel Planner Multi-Agent App

A demonstration application that showcases AI agent orchestration for travel planning using Google ADK's multi-agent architecture patterns (ParallelAgent + SequentialAgent) implemented in a browser environment.

**Experience Qualities**:
1. **Transparent** - Users can see each specialized agent working in real-time, making the AI orchestration process visible and understandable
2. **Intelligent** - Multiple AI agents collaborate to provide comprehensive travel plans that consider flights, accommodations, activities, and daily itineraries
3. **Efficient** - Parallel agent execution reduces wait time, with visual feedback showing agents working simultaneously

**Complexity Level**: Light Application (multiple features with basic state)
The app orchestrates multiple AI agents through a structured workflow, maintains session state for travel plans, and provides real-time status updates. While it demonstrates advanced AI concepts, the UI remains focused and streamlined.

## Essential Features

### Travel Input Form
- **Functionality**: Capture destination, trip duration (1-14 days), and budget level (Low/Medium/High)
- **Purpose**: Provide the necessary context for all AI agents to generate relevant recommendations
- **Trigger**: User lands on the application
- **Progression**: Empty form → User fills destination field → Selects duration slider → Chooses budget radio → Clicks "Plan My Trip" → Form locks during generation → Unlocks on completion
- **Success criteria**: All required fields validated before submission, form state persists during generation

### Multi-Agent Status Panel
- **Functionality**: Real-time visualization of four AI agents (Flight, Hotel, Activity, Itinerary) with status indicators
- **Purpose**: Make the parallel agent orchestration transparent and engaging for users
- **Trigger**: User submits the travel form
- **Progression**: All agents show "idle" → Three research agents (Flight/Hotel/Activity) transition to "working" simultaneously → Each completes and shows "done" with preview → Itinerary agent starts "working" → Final agent completes → Full results displayed
- **Success criteria**: Status transitions are smooth, timing feels natural, users understand the agent workflow

### AI Agent Orchestration (Google ADK Pattern)
- **Functionality**: Coordinate specialized LLM agents using Google ADK's multi-agent patterns - ParallelAgent for concurrent execution, SequentialAgent for ordered workflows
- **Purpose**: Generate comprehensive, contextual travel recommendations through specialized AI agents working in parallel, demonstrating reduced latency through concurrent execution
- **Trigger**: User submits valid travel request
- **Progression**: Request received → OrchestratorAgent (SequentialAgent) coordinates workflow → ParallelAgent spawns FlightAgent/HotelAgent/ActivityAgent → Three agents execute concurrently → Results aggregated → ItineraryAgent (sequential) synthesizes final plan → Display structured itinerary
- **Success criteria**: Each agent produces relevant, coherent output; parallel execution reduces total time vs sequential; itinerary integrates all recommendations logically

### Structured Itinerary Display
- **Functionality**: Render day-by-day travel plan with flights, accommodations, activities, and recommendations
- **Purpose**: Present the complete travel plan in an easy-to-read, actionable format
- **Trigger**: All agents complete their work
- **Progression**: Loading state → Markdown-formatted itinerary appears → User can scroll and read day-by-day plan → Option to start new plan
- **Success criteria**: Content is well-formatted, includes all agent outputs, organized chronologically

## Edge Case Handling

- **Invalid Destination**: Display validation error if destination field is empty or too short
- **API Failures**: Show error state with retry option if LLM calls fail
- **Long Generation Time**: Keep status indicators animated to show progress, prevent timeout perception
- **Partial Results**: If some agents complete but others fail, display partial results with clear indication of missing data
- **Rapid Re-submission**: Disable form during active generation to prevent concurrent requests

## Design Direction

The design should evoke a sense of sophisticated automation and technical transparency. Users should feel they're witnessing an advanced AI system at work, with a cybernetic, command-center aesthetic that makes the agent orchestration feel professional and cutting-edge.

## Color Selection

A dark, technical color scheme that emphasizes the AI/automation theme while maintaining readability and visual hierarchy.

- **Primary Color**: Electric Blue (oklch(0.65 0.22 240)) - Represents AI intelligence and technology, used for primary actions and agent status indicators
- **Secondary Colors**: 
  - Deep Navy (oklch(0.15 0.03 240)) - Background color that creates depth
  - Slate Gray (oklch(0.25 0.02 240)) - Card backgrounds and elevated surfaces
- **Accent Color**: Cyan (oklch(0.75 0.15 200)) - Highlight color for active agents and progress indicators
- **Foreground/Background Pairings**:
  - Primary (Electric Blue #4D9FFF): White text (#FFFFFF) - Ratio 5.2:1 ✓
  - Secondary (Deep Navy #1A1D2E): Light Gray text (#E5E7EB) - Ratio 11.8:1 ✓
  - Accent (Cyan #5DD9E8): Deep Navy text (#1A1D2E) - Ratio 9.4:1 ✓
  - Card (Slate Gray #2A2F42): White text (#FFFFFF) - Ratio 12.1:1 ✓

## Font Selection

Typography should convey technical precision while remaining highly legible for extended reading of itinerary details.

- **Typographic Hierarchy**:
  - H1 (App Title): Space Grotesk Bold / 36px / -0.02em letter spacing
  - H2 (Section Headers): Space Grotesk Semibold / 24px / -0.01em letter spacing
  - H3 (Agent Names): Space Grotesk Medium / 18px / normal letter spacing
  - Body (Itinerary Content): Inter Regular / 15px / 1.6 line height
  - Mono (Status Labels): JetBrains Mono Medium / 13px / 0.01em letter spacing

## Animations

Animations reinforce the sense of intelligent systems at work, with purposeful motion that guides attention to active agents and status changes.

- **Agent Status Transitions**: Pulse effect on "working" state, smooth color fade on completion
- **Card Reveals**: Staggered fade-in for agent cards (100ms delay between each)
- **Progress Indicators**: Animated gradient sweep for working agents
- **Form Submission**: Button transforms into loading spinner with scale transition
- **Results Panel**: Slide up with fade-in when itinerary is ready

## Component Selection

- **Components**:
  - **Card**: Agent status cards with custom gradient borders when active
  - **Button**: Primary action button with loading states for form submission
  - **Input**: Text input for destination with focus states
  - **Slider**: Trip duration selector (1-14 days) with value display
  - **RadioGroup**: Budget level selection (Low/Medium/High)
  - **Badge**: Status indicators (Idle/Working/Done) with color-coded states
  - **ScrollArea**: Itinerary viewer for long content
  - **Separator**: Divide sections between form, status panel, and results

- **Customizations**:
  - Agent cards with animated gradient borders during "working" state
  - Custom progress indicator with shimmer effect
  - Status badges with pulsing animation for active agents
  - Monospaced status labels for technical aesthetic

- **States**:
  - **Buttons**: Default (electric blue), hover (brighter blue), active (pressed down), disabled (muted gray), loading (spinner)
  - **Inputs**: Default (subtle border), focus (cyan glow), filled (white text), error (red border)
  - **Agent Cards**: Idle (muted), working (animated cyan border + pulse), done (green accent), error (red accent)

- **Icon Selection**:
  - **Airplane** (Flight Agent): Represents air travel
  - **Buildings** (Hotel Agent): Represents accommodations
  - **Compass** (Activity Agent): Represents exploration and activities
  - **ListChecks** (Itinerary Agent): Represents organized planning
  - **ArrowRight** (Submit): Forward action
  - **Warning** (Error): Alert users to issues

- **Spacing**:
  - Container padding: p-6 (24px)
  - Card gaps: gap-4 (16px)
  - Form field spacing: space-y-6 (24px vertical)
  - Section separation: my-8 (32px vertical)
  - Agent card grid: gap-6 (24px)

- **Mobile**:
  - Single column layout for all breakpoints
  - Agent cards stack vertically on mobile (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4)
  - Form inputs full width with comfortable touch targets (min 44px height)
  - Reduced padding on mobile (p-4 instead of p-6)
  - Sticky header with title remains visible during scroll
