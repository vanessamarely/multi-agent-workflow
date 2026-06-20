import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { TravelPlan } from '@/lib/types'
import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { marked } from 'marked'

interface ItineraryViewerProps {
  plan: TravelPlan | null
  onReset: () => void
}

export function ItineraryViewer({ plan, onReset }: ItineraryViewerProps) {
  if (!plan) {
    return null
  }

  const renderMarkdown = (content: string) => {
    const html = marked.parse(content, { async: false }) as string
    return html
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Your Travel Plan</h2>
        <Button onClick={onReset} variant="outline" className="gap-2">
          <ArrowCounterClockwise size={18} weight="bold" />
          New Trip
        </Button>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              ✈️ Flights
            </h3>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.flights) }}
            />
          </section>

          <Separator className="my-6" />

          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              🏨 Accommodations
            </h3>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.hotels) }}
            />
          </section>

          <Separator className="my-6" />

          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              🎯 Activities & Dining
            </h3>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.activities) }}
            />
          </section>

          <Separator className="my-6" />

          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              📋 Day-by-Day Itinerary
            </h3>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.itinerary) }}
            />
          </section>
        </div>
      </ScrollArea>
    </Card>
  )
}
