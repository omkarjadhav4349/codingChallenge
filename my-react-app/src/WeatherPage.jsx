import { useCallback, useEffect, useRef, useState } from 'react'
import './Weather.css'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search'
const REFRESH_INTERVAL = 5 * 60 * 1000

const WEATHER_CODES = {
    0: { label: 'Clear sky', icon: '☀️', nightIcon: '🌙', tone: 'clear' },
    1: { label: 'Mainly clear', icon: '🌤️', nightIcon: '🌙', tone: 'clear' },
    2: { label: 'Partly cloudy', icon: '⛅', tone: 'cloudy' },
    3: { label: 'Overcast', icon: '☁️', tone: 'cloudy' },
    45: { label: 'Fog', icon: '🌫️', tone: 'fog' },
    48: { label: 'Rime fog', icon: '🌫️', tone: 'fog' },
    51: { label: 'Light drizzle', icon: '🌦️', tone: 'rain' },
    53: { label: 'Drizzle', icon: '🌦️', tone: 'rain' },
    55: { label: 'Dense drizzle', icon: '🌧️', tone: 'rain' },
    56: { label: 'Freezing drizzle', icon: '🌧️', tone: 'rain' },
    57: { label: 'Heavy freezing drizzle', icon: '🌧️', tone: 'rain' },
    61: { label: 'Light rain', icon: '🌦️', tone: 'rain' },
    63: { label: 'Rain', icon: '🌧️', tone: 'rain' },
    65: { label: 'Heavy rain', icon: '🌧️', tone: 'rain' },
    66: { label: 'Freezing rain', icon: '🌧️', tone: 'rain' },
    67: { label: 'Heavy freezing rain', icon: '🌧️', tone: 'rain' },
    71: { label: 'Light snow', icon: '🌨️', tone: 'snow' },
    73: { label: 'Snow', icon: '❄️', tone: 'snow' },
    75: { label: 'Heavy snow', icon: '❄️', tone: 'snow' },
    77: { label: 'Snow grains', icon: '🌨️', tone: 'snow' },
    80: { label: 'Light showers', icon: '🌦️', tone: 'rain' },
    81: { label: 'Showers', icon: '🌧️', tone: 'rain' },
    82: { label: 'Heavy showers', icon: '🌧️', tone: 'rain' },
    85: { label: 'Snow showers', icon: '🌨️', tone: 'snow' },
    86: { label: 'Heavy snow showers', icon: '❄️', tone: 'snow' },
    95: { label: 'Thunderstorm', icon: '⛈️', tone: 'storm' },
    96: { label: 'Thunderstorm with hail', icon: '⛈️', tone: 'storm' },
    99: { label: 'Thunderstorm with heavy hail', icon: '⛈️', tone: 'storm' },
}

const COMPASS_DIRECTIONS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const DEFAULT_LOCATION = { name: 'London', admin1: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 }

function weatherFor(code, isDay = 1) {
    const condition = WEATHER_CODES[code] || { label: 'Changing skies', icon: '🌤️', tone: 'cloudy' }
    return { ...condition, icon: isDay === 0 && condition.nightIcon ? condition.nightIcon : condition.icon }
}

function compassDirection(degrees) {
    return Number.isFinite(degrees) ? COMPASS_DIRECTIONS[Math.round(degrees / 22.5) % 16] : '—'
}

function formatTemperature(value) {
    return Number.isFinite(value) ? `${Math.round(value)}°` : '—'
}

function formatClock(value) {
    const match = value?.match(/T(\d{2}):(\d{2})/)
    if (!match) return '—'
    const localTime = new Date(Date.UTC(2024, 0, 1, Number(match[1]), Number(match[2])))
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(localTime)
}

function formatForecastDay(date, index) {
    if (index === 0) return 'Today'
    if (index === 1) return 'Tomorrow'
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

function WeatherPage() {
    const [location, setLocation] = useState(DEFAULT_LOCATION)
    const [weather, setWeather] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [locating, setLocating] = useState(false)
    const [error, setError] = useState('')
    const [updatedAt, setUpdatedAt] = useState(null)
    const [searchText, setSearchText] = useState('')
    const [locations, setLocations] = useState([])
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState('')
    const requestRef = useRef(null)

    const fetchWeather = useCallback(async ({ quiet = false } = {}) => {
        requestRef.current?.abort()
        const controller = new AbortController()
        requestRef.current = controller
        if (quiet) setRefreshing(true)
        else setLoading(true)
        setError('')

        const params = new URLSearchParams({
            latitude: String(location.latitude),
            longitude: String(location.longitude),
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
            hourly: 'temperature_2m,precipitation_probability,weather_code',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max',
            forecast_hours: '24',
            forecast_days: '7',
            timezone: 'auto',
            wind_speed_unit: 'kmh',
        })

        try {
            const response = await fetch(`${FORECAST_API}?${params}`, { signal: controller.signal })
            if (!response.ok) throw new Error(`Weather service returned ${response.status}`)
            const data = await response.json()
            if (!data.current || !data.hourly || !data.daily) throw new Error('The weather service returned incomplete data.')
            setWeather(data)
            setUpdatedAt(Date.now())
        } catch (fetchError) {
            if (fetchError.name !== 'AbortError') setError(fetchError.message || 'Could not load weather right now. Please try again.')
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false)
                setRefreshing(false)
            }
        }
    }, [location])

    useEffect(() => {
        const initialFetchId = window.setTimeout(() => void fetchWeather(), 0)
        const intervalId = window.setInterval(() => void fetchWeather({ quiet: true }), REFRESH_INTERVAL)
        return () => {
            window.clearTimeout(initialFetchId)
            window.clearInterval(intervalId)
            requestRef.current?.abort()
        }
    }, [fetchWeather])

    async function searchLocations(event) {
        event.preventDefault()
        const query = searchText.trim()
        if (query.length < 2) {
            setSearchError('Enter at least two characters to search.')
            setLocations([])
            return
        }

        setSearching(true)
        setSearchError('')
        try {
            const params = new URLSearchParams({ name: query, count: '6', language: 'en', format: 'json' })
            const response = await fetch(`${GEOCODING_API}?${params}`)
            if (!response.ok) throw new Error(`Location search returned ${response.status}`)
            const data = await response.json()
            setLocations(data.results || [])
            if (!data.results?.length) setSearchError('No places found. Try a nearby city or a different spelling.')
        } catch (searchFetchError) {
            setSearchError(searchFetchError.message || 'Could not search places right now.')
        } finally {
            setSearching(false)
        }
    }

    function chooseLocation(place) {
        setLocation({ name: place.name, admin1: place.admin1 || '', country: place.country || '', latitude: place.latitude, longitude: place.longitude })
        setSearchText('')
        setLocations([])
        setSearchError('')
    }

    function locateUser() {
        if (!navigator.geolocation) {
            setError('Location is not available in this browser.')
            return
        }
        setLocating(true)
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setLocation({ name: 'Your location', admin1: `${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`, country: '', latitude: coords.latitude, longitude: coords.longitude })
                setLocating(false)
            },
            () => {
                setError('Could not get your location. Check your browser permission and try again.')
                setLocating(false)
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
        )
    }

    const current = weather?.current
    const currentCondition = current ? weatherFor(current.weather_code, current.is_day) : null
    const currentPlace = [location.admin1, location.country].filter(Boolean).join(', ')
    const daily = weather?.daily
    const hourly = weather?.hourly

    return (
        <main className="weather-shell">
            <header className="weather-header">
                <a className="weather-brand" href="/" aria-label="Back to Airtrack">
                    <span className="weather-brand-mark" aria-hidden="true">◒</span>
                    <span>SKY<span className="weather-brand-period">.</span></span>
                </a>
                <div className="weather-header-note"><span className="live-pulse" /> WEATHER DESK <span className="header-divider">/</span> BY OMKAR JADHAV</div>
                <a className="source-link" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo <span aria-hidden="true">↗</span></a>
            </header>

            <section className="weather-topline" id="weather">
                <div>
                    <p className="weather-eyebrow">A WINDOW INTO THE WEATHER</p>
                    <h1>Right here,<br /><span>right now.</span></h1>
                </div>
                <p className="weather-intro-copy">A little forecast for wherever you are.<br />Look outside, then look ahead.</p>
            </section>

            <section className="weather-toolbar" aria-label="Weather location controls">
                <div className="location-search-area">
                    <form className="location-search" onSubmit={searchLocations}>
                        <span className="location-search-icon" aria-hidden="true">⌕</span>
                        <label className="sr-only" htmlFor="location-search-input">Search for a city</label>
                        <input
                            id="location-search-input"
                            type="search"
                            placeholder="Search a city or place…"
                            value={searchText}
                            onChange={(event) => {
                                setSearchText(event.target.value)
                                setSearchError('')
                                setLocations([])
                            }}
                        />
                        <button className="location-search-submit" type="submit" disabled={searching}>{searching ? 'Searching…' : 'Find place'}</button>
                    </form>
                    {(locations.length > 0 || searchError) && (
                        <div className="location-results" role="region" aria-label="Location search results">
                            {searchError && <p className="location-search-error">{searchError}</p>}
                            {locations.map((place) => (
                                <button className="location-result" type="button" key={place.id} onClick={() => chooseLocation(place)}>
                                    <span className="location-result-pin" aria-hidden="true">⌖</span>
                                    <span><strong>{place.name}</strong><small>{[place.admin1, place.country].filter(Boolean).join(', ')}</small></span>
                                    <span className="location-result-arrow" aria-hidden="true">↗</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button className="geo-button" type="button" onClick={locateUser} disabled={locating}>
                    <span aria-hidden="true">◎</span>{locating ? 'Finding you…' : 'Use my location'}
                </button>
                <button className="weather-refresh" type="button" onClick={() => void fetchWeather()} disabled={loading || refreshing} aria-label="Refresh weather">
                    <span className={refreshing ? 'refresh-symbol is-spinning' : 'refresh-symbol'} aria-hidden="true">↻</span>
                    <span>{refreshing ? 'Updating' : 'Refresh'}</span>
                </button>
            </section>

            {error && <div className="weather-error" role="alert"><span>!</span>{error}<button type="button" onClick={() => void fetchWeather()}>Try again</button></div>}

            <section className={`current-weather-card${current?.is_day === 0 ? ' is-night' : ''}`} aria-label="Current weather">
                <div className="current-weather-copy">
                    <p className="current-kicker"><span className="current-live-dot" /> CURRENT CONDITIONS <span className="current-kicker-divider">·</span> {current ? `AS OF ${formatClock(current.time)}` : 'LIVE UPDATE'}</p>
                    <h2 className="current-city">{location.name}</h2>
                    <p className="current-region">{currentPlace || 'Local conditions'}</p>
                    {current ? (
                        <>
                            <div className="current-temp-row">
                                <strong className="current-temperature">{formatTemperature(current.temperature_2m)}</strong>
                                <span className="current-condition">{currentCondition?.label}</span>
                            </div>
                            <p className="current-high-low">Feels like {formatTemperature(current.apparent_temperature)} <span>·</span> H {formatTemperature(daily?.temperature_2m_max?.[0])} <span>·</span> L {formatTemperature(daily?.temperature_2m_min?.[0])}</p>
                        </>
                    ) : <div className="current-loading">{loading ? 'Gathering the latest conditions…' : 'Weather is temporarily unavailable.'}</div>}
                </div>
                <div className={`weather-illustration tone-${currentCondition?.tone || 'clear'}`} aria-hidden="true">
                    <span className="weather-orbit orbit-large" />
                    <span className="weather-orbit orbit-small" />
                    <span className="weather-icon-main">{currentCondition?.icon || '☀️'}</span>
                    <span className="weather-decoration decor-one">✳</span>
                    <span className="weather-decoration decor-two">·</span>
                    <span className="weather-decoration decor-three">✦</span>
                    <span className="illustration-caption">A LITTLE SKY REPORT</span>
                </div>
                <div className="current-card-footer">
                    <span><span className="footer-status-dot" /> {updatedAt ? `Fetched ${formatClock(new Date(updatedAt).toISOString())}` : 'Waiting for weather data'}</span>
                    <span>{weather?.timezone_abbreviation || 'LOCAL TIME'} <span className="footer-separator">/</span> {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°</span>
                </div>
            </section>

            <section className="weather-metrics" aria-label="Current weather details">
                <article className="metric-card">
                    <div className="metric-title"><span className="metric-icon humidity-icon" aria-hidden="true">◌</span><span>HUMIDITY</span></div>
                    <strong>{current ? `${current.relative_humidity_2m}%` : '—'}</strong>
                    <p>Relative air moisture</p>
                </article>
                <article className="metric-card">
                    <div className="metric-title"><span className="metric-icon wind-icon" aria-hidden="true">↗</span><span>WIND</span></div>
                    <strong>{current ? <>{Math.round(current.wind_speed_10m)} <small>km/h</small></> : '—'}</strong>
                    <p>{current ? `${compassDirection(current.wind_direction_10m)} · gusts ${Math.round(current.wind_gusts_10m)} km/h` : '10 m above ground'}</p>
                    {current && <span className="wind-direction-arrow" aria-hidden="true" style={{ transform: `rotate(${current.wind_direction_10m}deg)` }}>↑</span>}
                </article>
                <article className="metric-card">
                    <div className="metric-title"><span className="metric-icon rain-icon" aria-hidden="true">⌁</span><span>PRECIPITATION</span></div>
                    <strong>{current ? <>{Number(current.precipitation).toFixed(1)} <small>mm</small></> : '—'}</strong>
                    <p>In the current hour</p>
                </article>
                <article className="metric-card">
                    <div className="metric-title"><span className="metric-icon pressure-icon" aria-hidden="true">◉</span><span>PRESSURE</span></div>
                    <strong>{current ? <>{Math.round(current.surface_pressure)} <small>hPa</small></> : '—'}</strong>
                    <p>{current ? `${current.cloud_cover}% cloud cover` : 'At the surface'}</p>
                </article>
            </section>

            <section className="forecast-section hourly-section" aria-labelledby="hourly-title">
                <div className="forecast-heading">
                    <div><p className="section-index">01 <span>/</span> THE NEXT HOURS</p><h2 id="hourly-title">Hour by hour</h2></div>
                    {weather && <span className="forecast-timezone">LOCAL TIME · {weather.timezone_abbreviation}</span>}
                </div>
                <div className="hourly-strip">
                    {hourly?.time?.slice(0, 12).map((time, index) => {
                        const condition = weatherFor(hourly.weather_code[index], 1)
                        const probability = hourly.precipitation_probability[index]
                        return (
                            <article className={`hour-card${index === 0 ? ' is-now' : ''}`} key={time}>
                                <span className="hour-time">{index === 0 ? 'NOW' : formatClock(time)}</span>
                                <span className="hour-icon" aria-hidden="true">{condition.icon}</span>
                                <strong>{formatTemperature(hourly.temperature_2m[index])}</strong>
                                <span className="hour-rain">{Number.isFinite(probability) ? `${probability}%` : '—'}</span>
                                <span className="rain-bar"><i style={{ height: `${Math.max(3, probability || 0)}%` }} /></span>
                            </article>
                        )
                    })}
                    {!weather && <div className="forecast-loading">{loading ? 'Loading hourly forecast…' : 'Hourly forecast unavailable.'}</div>}
                </div>
                <p className="hourly-legend"><span className="legend-blue" /> Chance of precipitation</p>
            </section>

            <section className="forecast-section week-section" aria-labelledby="week-title">
                <div className="forecast-heading week-heading">
                    <div><p className="section-index">02 <span>/</span> THE WEEK AHEAD</p><h2 id="week-title">Seven-day outlook</h2></div>
                    {daily && <div className="sun-times"><span>☼ <small>SUNRISE</small> {formatClock(daily.sunrise[0])}</span><span>☾ <small>SUNSET</small> {formatClock(daily.sunset[0])}</span></div>}
                </div>
                <div className="daily-list">
                    {daily?.time?.map((date, index) => {
                        const condition = weatherFor(daily.weather_code[index], 1)
                        return (
                            <article className={`daily-row${index === 0 ? ' is-today' : ''}`} key={date}>
                                <span className="daily-name">{formatForecastDay(date, index)}</span>
                                <span className="daily-condition-icon" aria-hidden="true">{condition.icon}</span>
                                <span className="daily-condition">{condition.label}</span>
                                <span className="daily-rain">{Number.isFinite(daily.precipitation_probability_max[index]) ? `☂ ${daily.precipitation_probability_max[index]}%` : ''}</span>
                                <span className="daily-temperatures"><span>{formatTemperature(daily.temperature_2m_min[index])}</span><i><b style={{ left: `${10 + index * 6}%`, width: `${38 + (index % 3) * 8}%` }} /></i><strong>{formatTemperature(daily.temperature_2m_max[index])}</strong></span>
                            </article>
                        )
                    })}
                    {!daily && <div className="forecast-loading">{loading ? 'Loading the week ahead…' : 'Daily forecast unavailable.'}</div>}
                </div>
            </section>

            <footer className="weather-footer">
                <p>Current conditions use frequently updated weather models; forecasts can change. Check local guidance for severe weather.</p>
                <div><span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></span><span>·</span><span>Location data by <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a></span><span>·</span><a href="/">Back to Airtrack ↗</a></div>
            </footer>
        </main>
    )
}

export default WeatherPage
