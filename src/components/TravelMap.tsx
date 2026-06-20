import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import * as d3 from 'd3'
import { motion } from 'framer-motion'

interface Location {
  name: string
  coordinates: [number, number]
}

interface TravelMapProps {
  destination: string
  origin?: string
}

const cityCoordinates: Record<string, [number, number]> = {
  'tokyo': [139.6917, 35.6895],
  'japan': [139.6917, 35.6895],
  'paris': [2.3522, 48.8566],
  'france': [2.3522, 48.8566],
  'new york': [-74.0060, 40.7128],
  'nyc': [-74.0060, 40.7128],
  'london': [-0.1278, 51.5074],
  'uk': [-0.1278, 51.5074],
  'rome': [12.4964, 41.9028],
  'italy': [12.4964, 41.9028],
  'barcelona': [2.1734, 41.3851],
  'spain': [-3.7038, 40.4168],
  'dubai': [55.2708, 25.2048],
  'singapore': [103.8198, 1.3521],
  'sydney': [151.2093, -33.8688],
  'australia': [151.2093, -33.8688],
  'bangkok': [100.5018, 13.7563],
  'thailand': [100.5018, 13.7563],
  'bali': [115.1889, -8.4095],
  'indonesia': [115.1889, -8.4095],
  'istanbul': [28.9784, 41.0082],
  'turkey': [28.9784, 41.0082],
  'mexico city': [-99.1332, 19.4326],
  'mexico': [-99.1332, 19.4326],
  'los angeles': [-118.2437, 34.0522],
  'la': [-118.2437, 34.0522],
  'miami': [-80.1918, 25.7617],
  'san francisco': [-122.4194, 37.7749],
  'chicago': [-87.6298, 41.8781],
  'seattle': [-122.3321, 47.6062],
  'boston': [-71.0589, 42.3601],
  'amsterdam': [4.9041, 52.3676],
  'netherlands': [4.9041, 52.3676],
  'berlin': [13.4050, 52.5200],
  'germany': [13.4050, 52.5200],
  'vienna': [16.3738, 48.2082],
  'austria': [16.3738, 48.2082],
  'prague': [14.4378, 50.0755],
  'lisbon': [-9.1393, 38.7223],
  'portugal': [-9.1393, 38.7223],
  'athens': [23.7275, 37.9838],
  'greece': [23.7275, 37.9838],
  'cairo': [31.2357, 30.0444],
  'egypt': [31.2357, 30.0444],
  'marrakech': [-7.9811, 31.6295],
  'morocco': [-7.9811, 31.6295],
  'rio de janeiro': [-43.1729, -22.9068],
  'brazil': [-43.1729, -22.9068],
  'buenos aires': [-58.3816, -34.6037],
  'argentina': [-58.3816, -34.6037],
  'hong kong': [114.1694, 22.3193],
  'seoul': [126.9780, 37.5665],
  'south korea': [126.9780, 37.5665],
  'beijing': [116.4074, 39.9042],
  'china': [116.4074, 39.9042],
  'mumbai': [72.8777, 19.0760],
  'india': [72.8777, 19.0760],
  'delhi': [77.1025, 28.7041],
}

const defaultOrigin: [number, number] = [-74.0060, 40.7128]

function findCoordinates(location: string): [number, number] | null {
  const normalized = location.toLowerCase().trim()
  
  for (const [key, coords] of Object.entries(cityCoordinates)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords
    }
  }
  
  return null
}

export function TravelMap({ destination, origin = 'New York' }: TravelMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [locations, setLocations] = useState<{ origin: Location; destination: Location } | null>(null)

  useEffect(() => {
    const destCoords = findCoordinates(destination)
    const originCoords = findCoordinates(origin) || defaultOrigin

    if (destCoords) {
      setLocations({
        origin: { name: origin, coordinates: originCoords },
        destination: { name: destination, coordinates: destCoords },
      })
    }
  }, [destination, origin])

  useEffect(() => {
    if (!svgRef.current || !locations) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    const projection = d3.geoMercator()
      .center([
        (locations.origin.coordinates[0] + locations.destination.coordinates[0]) / 2,
        (locations.origin.coordinates[1] + locations.destination.coordinates[1]) / 2,
      ])
      .scale(200)
      .translate([width / 2, height / 2])

    const originPoint = projection(locations.origin.coordinates)
    const destPoint = projection(locations.destination.coordinates)

    if (!originPoint || !destPoint) return

    const defs = svg.append('defs')
    
    const gradient = defs.append('linearGradient')
      .attr('id', 'route-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%')
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'oklch(0.75 0.15 200)')
      .attr('stop-opacity', 0.8)
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'oklch(0.65 0.22 240)')
      .attr('stop-opacity', 0.8)

    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')
    
    const feMerge = glowFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    const midX = (originPoint[0] + destPoint[0]) / 2
    const midY = (originPoint[1] + destPoint[1]) / 2 - 80

    const pathData = `M ${originPoint[0]},${originPoint[1]} Q ${midX},${midY} ${destPoint[0]},${destPoint[1]}`

    const routePath = g.append('path')
      .attr('d', pathData)
      .attr('fill', 'none')
      .attr('stroke', 'url(#route-gradient)')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8,8')
      .attr('opacity', 0)
      .attr('filter', 'url(#glow)')

    routePath.transition()
      .duration(800)
      .attr('opacity', 1)

    const planeIcon = '✈'
    const plane = g.append('text')
      .attr('font-size', '24')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('opacity', 0)
      .text(planeIcon)
      .attr('transform', `translate(${originPoint[0]}, ${originPoint[1]})`)

    const pathLength = (routePath.node() as SVGPathElement).getTotalLength()

    plane.transition()
      .delay(400)
      .duration(0)
      .attr('opacity', 1)
      .transition()
      .duration(3000)
      .ease(d3.easeQuadInOut)
      .attrTween('transform', () => {
        return (t: number) => {
          const point = (routePath.node() as SVGPathElement).getPointAtLength(t * pathLength)
          const nextPoint = (routePath.node() as SVGPathElement).getPointAtLength(Math.min(t * pathLength + 10, pathLength))
          const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI
          return `translate(${point.x}, ${point.y}) rotate(${angle + 45})`
        }
      })
      .on('end', function repeat(this: SVGTextElement) {
        d3.select(this)
          .transition()
          .duration(3000)
          .ease(d3.easeQuadInOut)
          .attrTween('transform', () => {
            return (t: number) => {
              const point = (routePath.node() as SVGPathElement).getPointAtLength(t * pathLength)
              const nextPoint = (routePath.node() as SVGPathElement).getPointAtLength(Math.min(t * pathLength + 10, pathLength))
              const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI
              return `translate(${point.x}, ${point.y}) rotate(${angle + 45})`
            }
          })
          .on('end', repeat)
      })

    const originCircle = g.append('circle')
      .attr('cx', originPoint[0])
      .attr('cy', originPoint[1])
      .attr('r', 0)
      .attr('fill', 'oklch(0.75 0.15 200)')
      .attr('opacity', 0.8)
      .attr('filter', 'url(#glow)')

    originCircle.transition()
      .duration(600)
      .attr('r', 8)

    const destCircle = g.append('circle')
      .attr('cx', destPoint[0])
      .attr('cy', destPoint[1])
      .attr('r', 0)
      .attr('fill', 'oklch(0.65 0.22 240)')
      .attr('opacity', 0.8)
      .attr('filter', 'url(#glow)')

    destCircle.transition()
      .delay(200)
      .duration(600)
      .attr('r', 10)

    g.append('text')
      .attr('x', originPoint[0])
      .attr('y', originPoint[1] + 25)
      .attr('text-anchor', 'middle')
      .attr('fill', 'oklch(0.95 0.01 240)')
      .attr('font-size', '12')
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text(locations.origin.name)
      .transition()
      .delay(400)
      .duration(400)
      .attr('opacity', 1)

    g.append('text')
      .attr('x', destPoint[0])
      .attr('y', destPoint[1] + 25)
      .attr('text-anchor', 'middle')
      .attr('fill', 'oklch(0.95 0.01 240)')
      .attr('font-size', '14')
      .attr('font-weight', '700')
      .attr('opacity', 0)
      .text(locations.destination.name)
      .transition()
      .delay(600)
      .duration(400)
      .attr('opacity', 1)

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString())
      })

    svg.call(zoom)

  }, [locations])

  if (!locations) {
    return (
      <Card className="p-6 h-[400px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Unable to map destination</p>
          <p className="text-xs mt-1">{destination}</p>
        </div>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🗺️ Travel Route
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {locations.origin.name} → {locations.destination.name}
          </p>
        </div>
        <div className="relative w-full h-[400px] rounded-lg overflow-hidden bg-card border border-border">
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ background: 'oklch(0.20 0.02 240)' }}
          />
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border">
            Scroll to zoom • Drag to pan
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
