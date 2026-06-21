# TV Logo Finder

Search and assign TV channel logos from a comprehensive database of 54,000+ logos. Works with [Dispatcharr](https://github.com/Dispatcharr/Dispatcharr) and [ECM (Enhanced Channel Manager)](https://github.com/Dispatcharr/Dispatcharr).

## Features

- **Visual Logo Search** — Search 54,000+ channel logos with instant thumbnail previews
- **One-Click Assignment** — Select a logo and apply it to any channel in your lineup
- **Channel Dashboard** — See which channels have logos and which are missing
- **Dual Backend Support** — Connect to ECM or Dispatcharr directly
- **External URLs** — Logos use GitHub raw URLs so Plex, Emby, and Jellyfin can render them
- **User Authentication** — Secure login with admin account creation on first run
- **Docker Ready** — Single container, minimal configuration

## Quick Start

### Docker Compose (Recommended)

```yaml
services:
  tv-logo-finder:
    image: ghcr.io/knmplace/tv-logo-finder:latest
    container_name: tv-logo-finder
    ports:
      - "6102:6102"
    volumes:
      - tv-logo-finder-data:/data
    environment:
      - JWT_SECRET=your-random-secret-key-here
    restart: unless-stopped

volumes:
  tv-logo-finder-data:
```

```bash
docker compose up -d
```

Open `http://your-server:6102` in your browser.

### Docker Run

```bash
docker run -d \
  --name tv-logo-finder \
  -p 6102:6102 \
  -v tv-logo-finder-data:/data \
  -e JWT_SECRET=your-random-secret-key-here \
  --restart unless-stopped \
  ghcr.io/knmplace/tv-logo-finder:latest
```

## First Run Setup

1. Open the app in your browser
2. Create an admin account (username + password)
3. Configure your backend connection:
   - **Backend Type**: Choose ECM or Dispatcharr
   - **Backend URL**: Enter your server URL (e.g., `http://your-server:6100` for ECM or `http://your-server:9191` for Dispatcharr)
   - **API Key**: Optional, only needed if your backend requires authentication
4. Test the connection
5. Click "Sync Channels" on the dashboard to pull your channel list

## Usage

### Finding and Assigning Logos

1. Go to the **Dashboard** to see all your channels
2. Channels missing logos are marked with a red "Missing" badge
3. Click the search icon on any channel to find a matching logo
4. Browse the visual results grid — logos are rendered as thumbnails
5. Click a logo to select it (teal border + checkmark)
6. Verify the correct channel is selected in the dropdown
7. Click **Apply Logo** to assign it

### Logo Search

You can also go directly to the **Logo Search** page:
1. Type any channel name (e.g., "ESPN", "HBO", "Bones")
2. Browse results from the [tvlogos](https://github.com/jesmannstl/tvlogos) database
3. Select a logo and choose which channel to assign it to

---

## Acknowledgements

> ### tvlogos by jesmannstl
> This project would not be possible without the incredible work of [**jesmannstl**](https://github.com/jesmannstl) and the [**tvlogos**](https://github.com/jesmannstl/tvlogos) repository. Their effort in curating and maintaining a collection of **54,000+ TV channel logos** across dozens of countries is what powers the entire search and discovery experience in TV Logo Finder. The logos are served directly from their repository via GitHub's CDN — no re-hosting, no copies. All credit for the logo artwork and organization belongs to jesmannstl and the tvlogos contributors. If you find this tool useful, please consider starring their repo and supporting their work.

> ### Dispatcharr
> [**Dispatcharr**](https://github.com/Dispatcharr/Dispatcharr) is the IPTV proxy and channel management platform that TV Logo Finder was originally built to complement. The Dispatcharr team has built an outstanding open-source solution for managing IPTV streams, EPG data, and channel lineups with features like multi-source failover, stream health monitoring, and a polished web interface. TV Logo Finder connects directly to Dispatcharr's API to sync your channel list and push logo assignments — it's designed to feel like a natural extension of the Dispatcharr workflow. Huge thanks to the Dispatcharr team for building such a solid and extensible platform.

> ### ECM (Enhanced Channel Manager)
> [**ECM**](https://github.com/Dispatcharr/Dispatcharr) extends Dispatcharr with higher-level channel management capabilities — auto-creation rules, bulk operations, stream probing, M3U change tracking, export profiles, and more. TV Logo Finder supports ECM as a first-class backend, leveraging its richer channel data and management APIs. If you're running ECM, TV Logo Finder integrates seamlessly with your existing setup. Thank you to the ECM developers for pushing the boundaries of what IPTV channel management can look like.

---

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `JWT_SECRET` | `tvlogofinder-dev-secret` | Secret key for JWT tokens. **Change this in production.** |
| `DATA_DIR` | `/data` | Directory for SQLite database storage |

## Building from Source

### Prerequisites

- Node.js 22+
- Python 3.12+
- Docker (for container builds)

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Docker Build

```bash
docker build -t tv-logo-finder .
docker run -p 6102:6102 -v tv-logo-finder-data:/data tv-logo-finder
```

## Tech Stack

- **Frontend**: React 19, Mantine 8, Vite, Zustand
- **Backend**: Python FastAPI, SQLite, httpx
- **Container**: Docker (nginx + uvicorn)

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/auth/status` | GET | No | Check setup/auth status |
| `/api/auth/setup` | POST | No | First-run admin creation |
| `/api/auth/login` | POST | No | Login, returns JWT |
| `/api/auth/me` | GET | Yes | Current user info |
| `/api/settings` | GET/PUT | Yes | App configuration |
| `/api/settings/test-connection` | POST | Yes | Test backend connectivity |
| `/api/channels` | GET | Yes | List cached channels |
| `/api/channels/sync` | POST | Yes | Sync channels from backend |
| `/api/logos/search` | GET | Yes | Search logo database |
| `/api/logos/apply` | POST | Yes | Assign logo to channel |

## License

MIT

## Author

Kyle ([@knmplace](https://github.com/knmplace))

*Assisted by Claude*
