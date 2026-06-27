/**
 * TravelForm.tsx — Formulario principal de entrada del usuario.
 *
 * Recoge los 4 parámetros que definen el viaje:
 *   - origin      → ciudad/país de partida
 *   - destination → ciudad/país de destino
 *   - duration    → duración en días (slider 1-14)
 *   - budget      → nivel de presupuesto (low / medium / high)
 *
 * Al hacer submit construye un objeto TravelRequest y lo pasa al
 * callback onSubmit definido en App.tsx, que inicia el pipeline ADK.
 */
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { TravelRequest } from '@/lib/types'
import { ArrowRight } from '@phosphor-icons/react'

interface TravelFormProps {
  onSubmit: (request: TravelRequest) => void
  isLoading: boolean
}

export function TravelForm({ onSubmit, isLoading }: TravelFormProps) {
  // Estado local del formulario — no se necesita una librería de forms
  // dado que son solo 4 campos simples sin validación compleja
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [duration, setDuration] = useState([7])   // Slider devuelve array
  const [budget, setBudget] = useState<'low' | 'medium' | 'high'>('medium')

  // Construye el TravelRequest y lo entrega al padre (App.tsx)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Doble guarda: el botón ya está deshabilitado, pero se protege el handler también
    if (!origin.trim() || !destination.trim()) {
      return
    }

    onSubmit({
      origin: origin.trim(),
      destination: destination.trim(),
      duration: duration[0],
      budget,
    })
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-6">Plan Your Trip</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="origin" className="text-base">
              Origin
            </Label>
            <Input
              id="origin"
              placeholder="e.g., New York, USA"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              disabled={isLoading}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination" className="text-base">
              Destination
            </Label>
            <Input
              id="destination"
              placeholder="e.g., Tokyo, Japan"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={isLoading}
              className="h-11"
              required
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="duration" className="text-base">
              Trip Duration
            </Label>
            <span className="text-sm font-mono text-muted-foreground">
              {duration[0]} {duration[0] === 1 ? 'day' : 'days'}
            </span>
          </div>
          <Slider
            id="duration"
            min={1}
            max={14}
            step={1}
            value={duration}
            onValueChange={setDuration}
            disabled={isLoading}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>1 day</span>
            <span>14 days</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Budget Level</Label>
          <RadioGroup
            value={budget}
            onValueChange={(value) => setBudget(value as 'low' | 'medium' | 'high')}
            disabled={isLoading}
            className="grid grid-cols-3 gap-4"
          >
            <div>
              <RadioGroupItem
                value="low"
                id="low"
                className="peer sr-only"
              />
              <Label
                htmlFor="low"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
              >
                <span className="text-sm font-medium">Low</span>
                <span className="text-xs text-muted-foreground mt-1">Budget</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="medium"
                id="medium"
                className="peer sr-only"
              />
              <Label
                htmlFor="medium"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
              >
                <span className="text-sm font-medium">Medium</span>
                <span className="text-xs text-muted-foreground mt-1">Moderate</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="high"
                id="high"
                className="peer sr-only"
              />
              <Label
                htmlFor="high"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
              >
                <span className="text-sm font-medium">High</span>
                <span className="text-xs text-muted-foreground mt-1">Luxury</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base gap-2"
          disabled={isLoading || !origin.trim() || !destination.trim()}
        >
          {isLoading ? (
            <>
              <span className="animate-pulse">Processing...</span>
            </>
          ) : (
            <>
              Plan My Trip
              <ArrowRight size={20} weight="bold" />
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
