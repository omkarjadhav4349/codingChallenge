# Airtrack & Weather

A React + Vite app with two linked pages:

- `/` — nearby aircraft tracker using the free public [adsb.lol API](https://api.adsb.lol/) and Leaflet/OpenStreetMap.
- `/weather` — current conditions, hourly weather, a seven-day outlook, city lookup, and optional browser geolocation using [Open-Meteo](https://open-meteo.com/).

## Run locally

```sh
npm install
npm run dev
```

Use the **Weather** link in the aircraft tracker header to open the weather page, or **Back to Airtrack** to return. Both pages default to London. The flight feed is proxied by Vite to avoid browser CORS; weather and city search use Open-Meteo’s public no-key endpoints directly. Weather refreshes every five minutes, and current weather models are updated frequently (not instrument-level live observations).

## Build

```sh
npm run lint
npm run build
npm run preview
```

For production hosting, keep the SPA fallback for `/weather`, and configure `/api/traffic/*` to proxy to `https://api.adsb.lol/v2/*`. The Open-Meteo APIs do not require a key for this use. Review each provider’s terms before production use. Weather data is credited to Open-Meteo and GeoNames; ADS-B and map attribution appear in the tracker.
