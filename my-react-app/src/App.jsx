import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import WeatherPage from './WeatherPage.jsx'
import './App.css'

const API_ROOT = '/api/traffic'
const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 }
const REFRESH_INTERVAL = 15_000

function aircraftLabel(aircraft) {
    return aircraft.flight?.trim() || aircraft.r || aircraft.hex?.toUpperCase() || 'Unknown flight'
}

function formatAltitude(altitude) {
    if (altitude === 'ground') return 'On ground'
    const value = Number(altitude)
    return Number.isFinite(value) ? `${Math.round(value).toLocaleString()} ft` : '—'
}

function formatHeading(heading) {
    return Number.isFinite(heading) ? `${Math.round(heading)}°` : '—'
}

function formatUpdatedAt(timestamp, now) {
    if (!timestamp) return 'Waiting for first position report'
    const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
    return seconds < 2 ? 'Updated just now' : `Updated ${seconds}s ago`
}

function makeAircraftIcon(aircraft, isSelected) {
    const heading = Number(aircraft.true_heading ?? aircraft.track ?? 0)
    const safeHeading = Number.isFinite(heading) ? heading : 0
    return L.divIcon({
        className: 'aircraft-icon-wrap',
        html: `<span class="aircraft-icon${isSelected ? ' is-selected' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${safeHeading}deg)"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" /></svg></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
    })
}

function RecenterMap({ center }) {
    const map = useMap()
    useEffect(() => {
        map.flyTo([center.lat, center.lng], map.getZoom(), { duration: 0.8 })
    }, [center, map])
    return null
}

function TrafficMap({ aircraft, center, selectedHex, onSelect }) {
    return (
        <MapContainer
            className="traffic-map"
            center={[center.lat, center.lng]}
            zoom={7}
            minZoom={3}
            maxZoom={15}
            zoomControl={false}
            scrollWheelZoom
        >
            <RecenterMap center={center} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="bottomright" />
            {aircraft.map((plane) => {
                if (!Number.isFinite(plane.lat) || !Number.isFinite(plane.lon)) return null
                const selected = plane.hex === selectedHex
                return (
                    <Marker
                        key={plane.hex}
                        position={[plane.lat, plane.lon]}
                        icon={makeAircraftIcon(plane, selected)}
                        eventHandlers={{ click: () => onSelect(plane.hex) }}
                        zIndexOffset={selected ? 1000 : 0}
                    >
                        <Popup>
                            <div className="map-popup">
                                <strong>{aircraftLabel(plane)}</strong>
                                <span>{plane.t || 'Aircraft type unavailable'} · {formatAltitude(plane.alt_baro)}</span>
                                <span>{Number.isFinite(plane.gs) ? `${Math.round(plane.gs)} kt` : 'Speed unavailable'} · heading {formatHeading(plane.track)}</span>
                            </div>
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    )
}

function AircraftTracker() {
    const [center, setCenter] = useState(DEFAULT_CENTER)
    const [radius, setRadius] = useState(150)
    const [aircraft, setAircraft] = useState([])
    const [selectedHex, setSelectedHex] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [locating, setLocating] = useState(false)
    const [error, setError] = useState('')
    const [updatedAt, setUpdatedAt] = useState(null)
    const [clock, setClock] = useState(0)
    const controllerRef = useRef(null)

    const fetchTraffic = useCallback(async ({ quiet = false } = {}) => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        if (quiet) setRefreshing(true)
        else setLoading(true)
        setError('')

        const url = `${API_ROOT}/lat/${center.lat.toFixed(4)}/lon/${center.lng.toFixed(4)}/dist/${radius}`

        try {
            const response = await fetch(url, { signal: controller.signal })
            if (!response.ok) throw new Error(`Flight feed returned ${response.status}`)
            const data = await response.json()
            setAircraft(Array.isArray(data.ac) ? data.ac : [])
            setUpdatedAt(Date.now())
        } catch (fetchError) {
            if (fetchError.name !== 'AbortError') {
                setError(fetchError.message || 'Could not connect to the flight feed. Please try again.')
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false)
                setRefreshing(false)
            }
        }
    }, [center, radius])

    useEffect(() => {
        const initialFetchId = window.setTimeout(() => void fetchTraffic(), 0)
        const intervalId = window.setInterval(() => void fetchTraffic({ quiet: true }), REFRESH_INTERVAL)
        return () => {
            window.clearTimeout(initialFetchId)
            window.clearInterval(intervalId)
            controllerRef.current?.abort()
        }
    }, [fetchTraffic])

    useEffect(() => {
        const clockId = window.setInterval(() => setClock(Date.now()), 1000)
        return () => window.clearInterval(clockId)
    }, [])

    const visibleAircraft = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return aircraft
        return aircraft.filter((plane) => [plane.flight, plane.r, plane.hex, plane.t]
            .some((value) => value?.toLowerCase().includes(query)))
    }, [aircraft, search])

    const selectedAircraft = aircraft.find((plane) => plane.hex === selectedHex)

    function locateUser() {
        if (!navigator.geolocation) {
            setError('Location is not available in this browser.')
            return
        }
        setLocating(true)
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setCenter({ lat: coords.latitude, lng: coords.longitude })
                setLocating(false)
            },
            () => {
                setError('Could not get your location. Check your browser permission and try again.')
                setLocating(false)
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
        )
    }

    return (
        <main className="tracker-shell">
            <header className="tracker-header">
                <a className="tracker-brand" href="/" aria-label="Airtrack home">
                    <span className="brand-mark" aria-hidden="true">✳</span>
                    <span>AIRTRACK<span className="brand-period">.</span></span>
                </a>
                <div className="header-right">
                    <span className="data-credit">A little sky-watching by Omkar Jadhav</span>
                    <a className="header-link weather-page-link" href="/weather">Weather <span aria-hidden="true">↗</span></a>
                    <a className="header-link" href="https://www.adsb.lol/" target="_blank" rel="noreferrer">Data source <span aria-hidden="true">↗</span></a>
                </div>
            </header>

            <section className="tracker-intro" id="tracker">
                <div>
                    <p className="tracker-eyebrow"><span className="live-dot" /> LIVE FLIGHT RADAR <span className="eyebrow-divider">/</span> ADS-B FEED</p>
                    <h1>Look up.<br /><span>What’s flying?</span></h1>
                    <p className="tracker-subtitle">A live window into aircraft reporting their position around you.</p>
                </div>
                <div className="flight-stat" aria-live="polite">
                    <span className="stat-label">AIRCRAFT IN VIEW</span>
                    <strong>{loading && !updatedAt ? '—' : aircraft.length.toLocaleString()}</strong>
                    <span className="stat-updated">{formatUpdatedAt(updatedAt, clock)}</span>
                </div>
            </section>

            <section className="tracker-controls" aria-label="Tracker controls">
                <label className="search-box">
                    <span className="search-icon" aria-hidden="true">⌕</span>
                    <span className="sr-only">Search flights</span>
                    <input
                        type="search"
                        placeholder="Search callsign, registration, type…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    {search && <button className="clear-search" type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
                </label>
                <div className="control-actions">
                    <label className="radius-control">
                        <span>RANGE</span>
                        <select value={radius} onChange={(event) => setRadius(Number(event.target.value))} aria-label="Search radius">
                            <option value={50}>50 nm</option>
                            <option value={100}>100 nm</option>
                            <option value={150}>150 nm</option>
                            <option value={250}>250 nm</option>
                        </select>
                    </label>
                    <button className="locate-button" type="button" onClick={locateUser} disabled={locating}>
                        <span aria-hidden="true">◎</span> {locating ? 'Locating…' : 'Near me'}
                    </button>
                    <button className="refresh-button" type="button" onClick={() => void fetchTraffic()} disabled={loading || refreshing} aria-label="Refresh aircraft positions">
                        <span className={refreshing ? 'refresh-glyph is-spinning' : 'refresh-glyph'} aria-hidden="true">↻</span>
                        <span className="refresh-label">{refreshing ? 'Updating' : 'Refresh'}</span>
                    </button>
                </div>
            </section>

            {error && <div className="feed-error" role="alert"><span>!</span> {error} <button type="button" onClick={() => void fetchTraffic()}>Try again</button></div>}

            <section className="tracker-layout" aria-label="Live aircraft map and list">
                <div className="map-panel">
                    <div className="map-heading">
                        <div>
                            <span className="panel-kicker">TRAFFIC MAP</span>
                            <span className="map-coordinates">{center.lat.toFixed(2)}°, {center.lng.toFixed(2)}°</span>
                        </div>
                        <span className="map-live"><span className="live-dot" /> LIVE</span>
                    </div>
                    <div className="map-frame">
                        <TrafficMap aircraft={aircraft} center={center} selectedHex={selectedHex} onSelect={setSelectedHex} />
                        <div className="map-legend"><span className="legend-plane" aria-hidden="true">✈</span> Live aircraft positions</div>
                        {selectedAircraft && (
                            <article className="selected-card">
                                <button type="button" className="selected-close" onClick={() => setSelectedHex(null)} aria-label="Close selected flight">×</button>
                                <span className="selected-kicker">SELECTED AIRCRAFT</span>
                                <strong>{aircraftLabel(selectedAircraft)}</strong>
                                <span>{selectedAircraft.r || selectedAircraft.hex?.toUpperCase()} {selectedAircraft.t ? `· ${selectedAircraft.t}` : ''}</span>
                                <div className="selected-stats">
                                    <span><small>ALTITUDE</small>{formatAltitude(selectedAircraft.alt_baro)}</span>
                                    <span><small>GROUND SPEED</small>{Number.isFinite(selectedAircraft.gs) ? `${Math.round(selectedAircraft.gs)} kt` : '—'}</span>
                                    <span><small>HEADING</small>{formatHeading(selectedAircraft.track)}</span>
                                </div>
                            </article>
                        )}
                    </div>
                </div>

                <aside className="traffic-panel" aria-label="Aircraft in range">
                    <div className="traffic-heading">
                        <div><span className="panel-kicker">IN YOUR SKIES</span><h2>Nearby traffic <span>{visibleAircraft.length}</span></h2></div>
                        <span className="sort-label">LIVE FEED</span>
                    </div>
                    <div className="traffic-list" aria-live="polite">
                        {loading && aircraft.length === 0 ? (
                            <div className="list-message"><span className="loading-spinner" />Finding aircraft nearby…</div>
                        ) : visibleAircraft.length === 0 ? (
                            <div className="list-message">
                                <span className="empty-sky" aria-hidden="true">☁</span>
                                <strong>{search ? 'No matching flights' : 'Quiet skies right now'}</strong>
                                <span>{search ? 'Try another callsign or aircraft type.' : 'Try a wider range or move the map to another area.'}</span>
                            </div>
                        ) : visibleAircraft.slice(0, 100).map((plane) => (
                            <button
                                type="button"
                                className={`traffic-row${plane.hex === selectedHex ? ' is-active' : ''}`}
                                key={plane.hex}
                                onClick={() => setSelectedHex(plane.hex)}
                            >
                                <span className="row-icon" aria-hidden="true">✈</span>
                                <span className="row-main"><strong>{aircraftLabel(plane)}</strong><small>{plane.t || 'Aircraft'}{plane.r ? ` · ${plane.r}` : ''}</small></span>
                                <span className="row-meta"><strong>{formatAltitude(plane.alt_baro)}</strong><small>{Number.isFinite(plane.gs) ? `${Math.round(plane.gs)} kt` : '—'}</small></span>
                            </button>
                        ))}
                        {visibleAircraft.length > 100 && <p className="list-cap">Showing the first 100 matches. Refine your search to find a flight.</p>}
                    </div>
                    <div className="traffic-footer">Positions refresh about every 15 seconds <span aria-hidden="true">↻</span></div>
                </aside>
            </section>

            <footer className="tracker-footer">
                <p>Aircraft positions are based on community-received ADS-B data and may be incomplete or delayed.</p>
                <div><a href="https://api.adsb.lol/" target="_blank" rel="noreferrer">adsb.lol API</a><span>·</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a><span>·</span><span>Made by Omkar Jadhav</span></div>
            </footer>
        </main>
    )
}

function App() {
    return window.location.pathname.startsWith('/weather') ? <WeatherPage /> : <AircraftTracker />
}

export default App