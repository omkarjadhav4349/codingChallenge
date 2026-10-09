# Airtrack — Live Aircraft Tracker

A React + Vite tracker for nearby aircraft using the free, public [adsb.lol API](https://api.adsb.lol/) and a Leaflet map with OpenStreetMap tiles. No API key is needed.

## Run locally

```sh
npm install
npm run dev
```

Vite proxies `/api/traffic/*` to `https://api.adsb.lol/v2/*` in development and preview so the browser can read the feed without a cross-origin request. The tracker starts near London; use **Near me** to center it on your current location. Positions refresh every 15 seconds.

## Build

```sh
npm run lint
npm run build
npm run preview
```

When deploying the static build, configure your hosting platform to reverse-proxy `/api/traffic/*` to `https://api.adsb.lol/v2/*` and preserve the remaining path. For example, `/api/traffic/lat/51.5/lon/-0.1/dist/150` should reach `/v2/lat/51.5/lon/-0.1/dist/150`. Do not use the upstream API URL directly in browser code; it does not enable browser CORS.

Aircraft data is community-received ADS-B and can be incomplete, delayed, or unavailable in some locations. The API is free for use; review its [terms and license](https://api.adsb.lol/) before production use. Map tiles and data are credited in the app.