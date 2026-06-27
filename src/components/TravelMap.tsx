/**
 * TravelMap.tsx — Mapa geográfico interactivo de la ruta del viaje.
 *
 * Usa react-leaflet con tiles de OpenStreetMap (sin API key) para mostrar
 * un mapa real con:
 *   - Marcador verde en el origen (🛫)
 *   - Marcador azul en el destino (🛬)
 *   - Línea punteada que une los dos puntos
 *   - Auto-zoom para encuadrar ambas ciudades en pantalla
 *
 * Las coordenadas están precargadas en `cityCoordinates` (formato [lng, lat]).
 * Al pasar a Leaflet se invierten a [lat, lng] que es lo que la librería espera.
 * Si el destino no se encuentra en el diccionario, muestra un fallback textual.
 */
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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
  'bogota': [-74.0721, 4.7110],
  'colombia': [-74.0721, 4.7110],
  'medellin': [-75.5636, 6.2442],
  'cartagena': [-75.5144, 10.3910],
  'lima': [-77.0428, -12.0464],
  'peru': [-77.0428, -12.0464],
  'santiago': [-70.6693, -33.4489],
  'chile': [-70.6693, -33.4489],
  'caracas': [-66.9036, 10.4806],
  'venezuela': [-66.9036, 10.4806],
  'quito': [-78.4678, -0.1807],
  'ecuador': [-78.4678, -0.1807],
  'havana': [-82.3666, 23.1136],
  'cuba': [-82.3666, 23.1136],
  'cancun': [-86.8515, 21.1619],
  'guadalajara': [-103.3496, 20.6597],
  'toronto': [-79.3832, 43.6532],
  'canada': [-79.3832, 43.6532],
  'vancouver': [-123.1207, 49.2827],
  'madrid': [-3.7038, 40.4168],
  'milan': [9.1900, 45.4654],
  'zurich': [8.5417, 47.3769],
  'switzerland': [8.5417, 47.3769],
  'brussels': [4.3517, 50.8503],
  'belgium': [4.3517, 50.8503],
  'stockholm': [18.0686, 59.3293],
  'sweden': [18.0686, 59.3293],
  'oslo': [10.7522, 59.9139],
  'norway': [10.7522, 59.9139],
  'copenhagen': [12.5683, 55.6761],
  'denmark': [12.5683, 55.6761],
  'nairobi': [36.8219, -1.2921],
  'kenya': [36.8219, -1.2921],
  'cape town': [18.4241, -33.9249],
  'south africa': [18.4241, -33.9249],
  'johannesburg': [28.0473, -26.2041],
  'lagos': [3.3792, 6.5244],
  'nigeria': [3.3792, 6.5244],
  'accra': [-0.1870, 5.6037],
  'ghana': [-0.1870, 5.6037],
  'kuala lumpur': [101.6869, 3.1390],
  'malaysia': [101.6869, 3.1390],
  'jakarta': [106.8456, -6.2088],
  'manila': [120.9842, 14.5995],
  'philippines': [120.9842, 14.5995],
  'taipei': [121.5654, 25.0330],
  'taiwan': [121.5654, 25.0330],
  'tel aviv': [34.7818, 32.0853],
  'israel': [34.7818, 32.0853],
  'riyadh': [46.7219, 24.6877],
  'saudi arabia': [46.7219, 24.6877],
  'abu dhabi': [54.3773, 24.4539],
  'doha': [51.5310, 25.2854],
  'qatar': [51.5310, 25.2854],
  'auckland': [174.7633, -36.8485],
  'new zealand': [174.7633, -36.8485],
  'warsaw': [21.0122, 52.2297],
  'poland': [21.0122, 52.2297],
  'budapest': [19.0402, 47.4979],
  'hungary': [19.0402, 47.4979],
  'bucharest': [26.1025, 44.4268],
  'romania': [26.1025, 44.4268],
}

// cityCoordinates stores [lng, lat]; Leaflet needs [lat, lng]
const defaultOrigin: [number, number] = [40.7128, -74.0060] // New York [lat, lng]

/**
 * Busca coordenadas [lat, lng] para una ciudad dada.
 * La búsqueda es case-insensitive e incluye coincidencias parciales
 * (ej. "New York City" coincide con la clave "new york").
 * Retorna null si la ciudad no está en el diccionario.
 */
function findCoordinates(location: string): [number, number] | null {
  const normalized = location.toLowerCase().trim()

  for (const [key, coords] of Object.entries(cityCoordinates)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      // swap from [lng, lat] → [lat, lng] for Leaflet
      return [coords[1], coords[0]]
    }
  }

  return null
}

/**
 * Crea un icono circular personalizado con el color especificado.
 * Se usa L.divIcon para evitar depender de imágenes externas de Leaflet
 * que a menudo fallan con bundlers como Vite.
 */
function makeIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  })
}

/**
 * FitBounds — Sub-componente que ajusta el zoom del mapa para mostrar
 * los dos marcadores. Usa el hook useMap() de react-leaflet para acceder
 * a la instancia del mapa y llamar fitBounds con un padding de 60px.
 * Solo se ejecuta cuando cambian las posiciones (efecto declarativo).
 */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [60, 60] })
    }
  }, [map, positions])
  return null
}

export function TravelMap({ destination, origin = 'New York' }: TravelMapProps) {
  const [locations, setLocations] = useState<{ origin: Location; destination: Location } | null>(null)
  const [destNotFound, setDestNotFound] = useState(false)

  useEffect(() => {
    const destCoords = findCoordinates(destination)
    const originCoords = findCoordinates(origin) || defaultOrigin

    if (destCoords) {
      setDestNotFound(false)
      setLocations({
        origin: { name: origin, coordinates: originCoords },
        destination: { name: destination, coordinates: destCoords },
      })
    } else {
      setDestNotFound(true)
      setLocations(null)
    }
  }, [destination, origin])

  if (!locations) {
    return (
      <Card className="p-6 h-[420px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-2xl mb-3">✈️</p>
          <p className="text-sm font-medium">
            {origin} → {destination}
          </p>
          {destNotFound && (
            <p className="text-xs mt-2 opacity-60">
              Map coordinates not available for this destination
            </p>
          )}
        </div>
      </Card>
    )
  }

  const positions: [number, number][] = [
    locations.origin.coordinates,
    locations.destination.coordinates,
  ]

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
        <div className="relative w-full h-[420px] rounded-lg overflow-hidden border border-border">
          <MapContainer
            center={[0, 0]}
            zoom={2}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds positions={positions} />
            <Marker position={locations.origin.coordinates} icon={makeIcon('#22c55e')}>
              <Popup>
                <strong>🛫 Origin</strong><br />{locations.origin.name}
              </Popup>
            </Marker>
            <Marker position={locations.destination.coordinates} icon={makeIcon('#3b82f6')}>
              <Popup>
                <strong>🛬 Destination</strong><br />{locations.destination.name}
              </Popup>
            </Marker>
            <Polyline
              positions={positions}
              pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8 8', opacity: 0.8 }}
            />
          </MapContainer>
        </div>
      </Card>
    </motion.div>
  )
}
