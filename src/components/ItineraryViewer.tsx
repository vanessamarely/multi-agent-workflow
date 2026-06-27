/**
 * ItineraryViewer.tsx — Visualizador del plan de viaje generado por el pipeline ADK.
 *
 * Recibe el TravelPlan completo (4 secciones: flights, hotels, activities, itinerary)
 * y renderiza cada una como HTML convertido desde Markdown, usando la librería `marked`.
 *
 * Las secciones se muestran en orden lógico dentro de un ScrollArea para no romper
 * el layout de la página. El botón "New Trip" llama a onReset para limpiar el estado
 * en App.tsx y permitir planificar un nuevo viaje.
 */
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
  // No renderiza nada hasta que el plan esté disponible (antes del evento 'complete')
  if (!plan) {
    return null
  }

  // Convierte Markdown devuelto por el LLM a HTML seguro para renderizar con dangerouslySetInnerHTML.
  // Se usa el modo síncrono de marked (async: false) para simplificar el render.
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
