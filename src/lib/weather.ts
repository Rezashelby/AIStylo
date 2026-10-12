import type { Season, Weather } from '@/types'

/**
 * Local conditions, on request only.
 *
 * Asks the browser for a position, then reads current conditions from
 * Open-Meteo (no key, no account). Nothing is stored or sent anywhere else;
 * the shopper opts in per session by pressing the weather chip.
 */

const FORECAST = 'https://api.open-meteo.com/v1/forecast'

/** WMO weather codes → short description, and whether it is wet. */
function describe(code: number): { summary: string; wet: boolean } {
  if (code === 0) return { summary: 'clear', wet: false }
  if (code <= 3) return { summary: code === 3 ? 'overcast' : 'partly cloudy', wet: false }
  if (code <= 48) return { summary: 'fog', wet: false }
  if (code <= 57) return { summary: 'drizzle', wet: true }
  if (code <= 67) return { summary: code <= 61 ? 'light rain' : 'rain', wet: true }
  if (code <= 77) return { summary: 'snow', wet: true }
  if (code <= 82) return { summary: 'showers', wet: true }
  if (code <= 86) return { summary: 'snow showers', wet: true }
  return { summary: 'thunderstorms', wet: true }
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not available in this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, () => {
      reject(new Error('Location permission was not granted.'))
    }, { maximumAge: 30 * 60_000, timeout: 10_000 })
  })
}

export async function localWeather(signal?: AbortSignal): Promise<Weather> {
  const { coords } = await position()
  const url = `${FORECAST}?latitude=${coords.latitude.toFixed(2)}&longitude=${coords.longitude.toFixed(2)}`
    + '&current=temperature_2m,weather_code'
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Weather service returned ${res.status}.`)
  const data = await res.json() as { current?: { temperature_2m: number; weather_code: number } }
  if (!data.current) throw new Error('Weather service returned no current conditions.')
  return { tempC: Math.round(data.current.temperature_2m), ...describe(data.current.weather_code) }
}

/** The season that dresses for this temperature, whatever the calendar says. */
export function seasonFor(w: Weather): Season {
  if (w.tempC < 8) return 'winter'
  if (w.tempC < 15) return 'autumn'
  if (w.tempC < 22) return 'spring'
  return 'summer'
}

/** Cold enough that a look without a layer would be a mistake. */
export const needsLayer = (w: Weather) => w.tempC < 14 || (w.wet && w.tempC < 18)

/** Warm enough that an outer layer is dead weight. */
export const tooWarmForLayer = (w: Weather) => w.tempC >= 24
