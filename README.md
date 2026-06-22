<p align="center">
  <img src="logo_finder.jpg" alt="TV Logo Finder" width="300" />
</p>

# TV Logo Finder

Search and assign TV channel logos from a comprehensive database of 54,000+ logos. Works with [Dispatcharr](https://github.com/Dispatcharr/Dispatcharr) and [ECM (Enhanced Channel Manager)](https://github.com/Dispatcharr/Dispatcharr).

## Features

- **Visual Logo Search** — Search 54,000+ channel logos with instant thumbnail previews
- **Smart Fuzzy Matching** — Intelligent search strips noise words (country prefixes, "Television", "Network", "HD", "West/East") to find the actual channel name
- **One-Click Assignment** — Select a logo and apply it directly to your channel in Dispatcharr or ECM
- **Batch Logo Search** — Select up to 5 channels from the dashboard and search logos for all of them in a tabbed interface
- **Channel Dashboard** — See all channels with logo status, existing logo URLs, and group names at a glance
- **Update Notifications** — Built-in update checker alerts you when a new version is available
- **Offset Pagination** — Load More button fetches additional results without duplicates
- **Collapsible Sidebar** — Toggle the navigation panel to maximize screen space
- **Dual Backend Support** — Connect to ECM or Dispatcharr with API key or username/password auth
- **External URLs** — Logos use GitHub raw URLs so Plex, Emby, and Jellyfin can render them directly
- **User Authentication** — Secure JWT login with admin account creation on first run
- **Docker Ready** — Single container with nginx + FastAPI, minimal configuration
- **Fast Startup** — Logo index preloaded on boot with gzip compression and code-split frontend chunks

## Quick Start

### Docker Compose (Recommended)

```yaml
services:
  tv-logo-finder:
    image: ghcr.io/knmplace/tv-logo-finder:latest
    container_name: tv-logo-finder
    ports:
      - "6102:80"
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
  -p 6102:80 \
  -v tv-logo-finder-data:/data \
  -e JWT_SECRET=your-random-secret-key-here \
  --restart unless-stopped \
  ghcr.io/knmplace/tv-logo-finder:latest
```

### Building from Source

```bash
git clone https://github.com/knmplace/tv-logo-finder.git
cd tv-logo-finder
docker build -t tv-logo-finder:local .
docker run -d \
  --name tv-logo-finder \
  -p 6102:80 \
  -v tv-logo-finder-data:/data \
  -e JWT_SECRET=your-random-secret-key-here \
  --restart unless-stopped \
  tv-logo-finder:local
```

## Installation Guide

### Prerequisites

- Docker installed on your server
- A running instance of [Dispatcharr](https://github.com/Dispatcharr/Dispatcharr) or [ECM](https://github.com/Dispatcharr/Dispatcharr)
- Network access between TV Logo Finder and your backend

### Step 1: Deploy the Container

Use either Docker Compose or `docker run` as shown above. The app runs on port **6102** by default.

**Important:** Set `JWT_SECRET` to a unique random string. This secures your login tokens. The default is insecure and should not be used in production.

### Step 2: First-Run Setup

1. Open `http://your-server:6102` in your browser
2. You'll see the **Setup Wizard** — create an admin account (username + password)
3. After login, go to **Settings** from the left sidebar

### Step 3: Configure Backend Connection

In Settings, configure your backend:

| Setting | Description |
|---------|-------------|
| **Backend Type** | Choose `Dispatcharr` or `ECM` |
| **Backend URL** | Your server URL (e.g., `http://192.168.1.100:9191` for Dispatcharr, `http://192.168.1.100:6100` for ECM) |
| **Auth Method** | `API Key` or `Username/Password` |
| **API Key** | Your backend's API key (if using API key auth) |
| **Username/Password** | Your backend login credentials (if using password auth) |

Click **Test Connection** to verify. You should see a green success message.

### Step 4: Sync Channels

1. Go to the **Dashboard** (first item in sidebar)
2. Click **Sync Channels** — this pulls your entire channel list from Dispatcharr/ECM
3. You'll see all channels with their current logo status

### Step 5: Start Assigning Logos

See the **Usage** section below for how to search and assign logos.

## Usage

### Channel Dashboard

The dashboard shows all your synced channels in a table:

| Column | Description |
|--------|-------------|
| **#** | Channel number |
| **Logo** | Current logo thumbnail (or placeholder if missing) |
| **Channel Name** | The channel's display name |
| **Existing Logo URL** | Current logo URL (clickable, with tooltip for long URLs) |
| **Group** | Channel group name from your backend |
| **Status** | "Has Logo" (green) or "Missing" (red) |
| **Actions** | Search icon to find a logo for this channel |

Use the filter tabs (All / Missing Logo / Has Logo) and search box to narrow down the list.

**Tip:** Click the sidebar toggle button (panel icon in the header) to collapse the sidebar and get more screen space for the table.

### Finding and Assigning Logos

**From the Dashboard:**
1. Find the channel you want to update
2. Click the **search icon** in the Actions column
3. You'll be taken to Logo Search with the channel name pre-filled
4. Browse the results grid — logos are shown as thumbnails with filenames
5. Click a logo to select it (teal border + checkmark appears)
6. The target channel is pre-selected in the dropdown at the bottom
7. Click **Apply Logo** to assign it

**Batch search (up to 5 channels at once):**
1. Use the **checkboxes** on the left side of the dashboard to select up to 5 channels
2. A bottom bar appears showing your selected channels
3. Click **Search Logos for Selected**
4. You'll see a **tabbed interface** — one tab per channel, each with its own search results
5. Search and apply logos independently for each channel
6. A green checkmark appears on the tab after you apply a logo

**From Logo Search directly:**
1. Go to **Logo Search** in the sidebar
2. Type a channel name (e.g., "ESPN", "HBO", "Hallmark")
3. Browse results and click to select
4. Choose the target channel from the dropdown
5. Click **Apply Logo**

### How Search Works

The search engine matches your query against 54,000+ logo filenames from the [tvlogos](https://github.com/jesmannstl/tvlogos) repository. It uses intelligent fuzzy matching:

1. **Country prefix stripping** — Prefixes like "USA", "UK:", "CA|" are automatically removed from your search query
2. **Noise word filtering** — Common words that don't help identify a channel are stripped:
   - Directional: `East`, `West`
   - Quality: `HD`, `UHD`, `4K`, `FHD`, `SD`
   - Generic: `Television`, `Network`, `Channel`, `TV`, `Broadcasting`
3. **Smart matching** — After cleaning, the core channel name is matched against filenames:
   - Exact match scores highest (e.g., "espn" matches `espn.png`)
   - Starts-with match scores next (e.g., "espn" matches `espnhd.png`)
   - Multi-word queries require **all** words to appear in the filename
   - Short words (4 chars or less) must match at the **start** of the filename to avoid false positives
4. **Pagination** — Results load 30 at a time. Click "Load More" for additional matches.

**Example:** Searching for `USA ION Television West` strips "USA" (country), "Television" (noise), "West" (noise), and searches for just `ION` — returning `ion.png`, `ionmystery.png`, `ionnetwork.png`, etc.

### Updating Logos

When you apply a logo:
1. A new logo entry is created in your backend (Dispatcharr/ECM) with the GitHub raw URL
2. The logo is assigned to the selected channel
3. Your media server (Plex/Emby/Jellyfin) will pull the logo directly from GitHub's CDN
4. The dashboard updates to show the new logo URL

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `JWT_SECRET` | `tvlogofinder-dev-secret` | Secret key for JWT tokens. **Change this in production.** |
| `DATA_DIR` | `/data` | Directory for SQLite database storage |

## Upgrading

To upgrade to a new version:

```bash
# Docker Compose
docker compose pull
docker compose up -d

# Docker Run (from source)
cd tv-logo-finder
git pull origin main
docker build -t tv-logo-finder:local .
docker stop tv-logo-finder && docker rm tv-logo-finder
docker run -d \
  --name tv-logo-finder \
  -p 6102:80 \
  -v tv-logo-finder-data:/data \
  -e JWT_SECRET=your-random-secret-key-here \
  --restart unless-stopped \
  tv-logo-finder:local
```

Your data (user accounts, settings, cached channels) is stored in the Docker volume and persists across upgrades.

## Beta Builds

A `beta` image is automatically built from the latest code on `main` after every push. It includes the newest features and fixes but may be unstable. The app will display a **BETA** badge in the header and show the version as `x.x.x-beta` so you always know which channel you're running.

### Using the Beta Image

Replace `latest` with `beta` in your compose file or run command:

```yaml
services:
  tv-logo-finder:
    image: ghcr.io/knmplace/tv-logo-finder:beta
    # ... rest of config stays the same
```

### Switching Between Stable and Beta

| Image Tag | Description |
|-----------|-------------|
| `ghcr.io/knmplace/tv-logo-finder:latest` | Stable release — tested and tagged |
| `ghcr.io/knmplace/tv-logo-finder:beta` | Latest from main — newest features, may have bugs |

To switch, change the image tag and pull:

```bash
# Switch to beta
docker compose pull
docker compose up -d

# Switch back to stable — change image tag back to :latest, then:
docker compose pull
docker compose up -d
```

Your data volume is shared between both, so switching is seamless — no data loss.

> **Note:** On first login or first sync, the filter tabs and sync button may take a moment to become responsive while the channel list is being fetched from your backend. This is normal and only occurs on the initial load.

## Local Development

### Prerequisites

- Node.js 22+
- Python 3.12+

### Running Locally

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

The frontend dev server proxies API requests to `localhost:6102`.

## Tech Stack

- **Frontend**: React 19, Mantine 8, Vite 7, Zustand, Lucide Icons
- **Backend**: Python FastAPI, SQLite (async via aiosqlite), httpx
- **Container**: Docker multi-stage build (Node 22 + Python 3.12-slim + nginx)
- **Logo Source**: [jesmannstl/tvlogos](https://github.com/jesmannstl/tvlogos) via GitHub API

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
| `/api/logos/search` | GET | Yes | Search logo database (`q`, `limit`, `offset` params) |
| `/api/logos/apply` | POST | Yes | Assign logo to channel |
| `/api/updates/check` | GET | Yes | Check for new releases (`include_beta` param) |

---

## Acknowledgements

> ### tvlogos by jesmannstl
> This project would not be possible without the incredible work of [**jesmannstl**](https://github.com/jesmannstl) and the [**tvlogos**](https://github.com/jesmannstl/tvlogos) repository. Their effort in curating and maintaining a collection of **54,000+ TV channel logos** across dozens of countries is what powers the entire search and discovery experience in TV Logo Finder. The logos are served directly from their repository via GitHub's CDN — no re-hosting, no copies. All credit for the logo artwork and organization belongs to jesmannstl and the tvlogos contributors. If you find this tool useful, please consider starring their repo and supporting their work.

> ### Dispatcharr
> [**Dispatcharr**](https://github.com/Dispatcharr/Dispatcharr) is the IPTV proxy and channel management platform that TV Logo Finder was originally built to complement. The Dispatcharr team has built an outstanding open-source solution for managing IPTV streams, EPG data, and channel lineups with features like multi-source failover, stream health monitoring, and a polished web interface. TV Logo Finder connects directly to Dispatcharr's API to sync your channel list and push logo assignments — it's designed to feel like a natural extension of the Dispatcharr workflow. Huge thanks to the Dispatcharr team for building such a solid and extensible platform.

> ### ECM (Enhanced Channel Manager)
> [**ECM**](https://github.com/Dispatcharr/Dispatcharr) extends Dispatcharr with higher-level channel management capabilities — auto-creation rules, bulk operations, stream probing, M3U change tracking, export profiles, and more. TV Logo Finder supports ECM as a first-class backend, leveraging its richer channel data and management APIs. If you're running ECM, TV Logo Finder integrates seamlessly with your existing setup. Thank you to the ECM developers for pushing the boundaries of what IPTV channel management can look like.

---

## License

MIT

## Author

Kyle ([@knmplace](https://github.com/knmplace))

*Assisted by Claude*
