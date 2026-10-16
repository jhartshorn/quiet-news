# Quiet News

A lightweight personal news dashboard for a Raspberry Pi or Mac. One Node.js process collects curated RSS/Atom feeds, serves a responsive browser interface, and stores history and shared reading preferences in SQLite. No paid APIs, AI service, database server, or frontend build step.

## Test on your Mac

Install and start Docker Desktop. In this project folder:

```sh
cp .env.example .env
docker compose up -d --build
```

Open **http://localhost:2468**. The first collection can take a few minutes; the page updates automatically. Sources shows individual feed errors. Check container status and logs:

```sh
docker compose ps
docker compose logs --tail=50 news
```

Stop with `docker compose down`. Your database stays in the named volume. **Do not add `-v` unless you intend to delete your news, bookmarks, and preferences.**

## Deploy on your Raspberry Pi

With Docker Engine, a recent Docker Compose plugin (supporting `--wait`), and `rsync` installed on the Pi, run this from your Mac:

```sh
./scripts/deploy
```

The script connects to `pi@raspberrypi`, copies the project to `~/quiet-news`, builds the image on the Pi, and waits up to 180 seconds for the container to become healthy. It preserves an existing Pi `.env` and the database volume, and excludes local dependencies, data, credentials, and reports from the transfer. On a first deployment it creates `.env` with LAN access and port 2468. Existing `.env` port settings are preserved; the script prints the actual port mapping. Docker must be usable by the SSH user without an interactive sudo prompt.

To use another SSH destination:

```sh
./scripts/deploy pi@another-host
```

Manual setup and deployment:

Use **64-bit Raspberry Pi OS**, preferably on a Pi 4 or Pi 5 with at least 2 GB RAM. The Docker base supports ARM64 and Mac architectures. A 32-bit Pi installation is not supported by this setup. Use an SSD if available, particularly for long-term database storage.

1. Install Docker Engine and its Compose plugin using Docker's Debian instructions: https://docs.docker.com/engine/install/debian/ (use the Debian version underlying your Pi OS). Ensure `docker compose version` works. Use `sudo docker …` if your user does not have Docker permission.
2. Copy this project folder to the Pi, excluding `node_modules`, `data`, `.git`, and your Mac `.env`. For example, from your Mac:

   ```sh
   rsync -av --exclude node_modules --exclude data --exclude .git --exclude .env ./ pi@raspberrypi:~/quiet-news/
   ssh pi@raspberrypi
   cd ~/quiet-news
   cp .env.example .env
   nano .env
   ```

3. Change `BIND_ADDRESS=0.0.0.0` to allow access from your home network. Set both `AUTH_USER` and a strong `AUTH_PASSWORD` if you want password protection. Keep `UPDATE_MINUTES=30` initially; increase to 60 to further reduce network activity. Save the file.
4. Build and start:

   ```sh
   docker compose up -d --build
   docker compose ps
   ```

5. Open **http://raspberrypi:2468** from your Mac or phone. If that name does not resolve, use the Pi's local IP address. The container restarts after a reboot if the Docker service is enabled.

Build separately on each machine; do not copy a Mac-built image onto a different architecture. The same source and Compose file work on both.

For remote access, use your existing VPN or an HTTPS reverse proxy with authentication. Do not forward this HTTP port directly to the Internet. Basic authentication credentials require HTTPS or a trusted VPN for protection in transit. All users share one reading profile; this release is for personal/household use, not a public news service.

## Reading and personalisation

- Top stories, UK, world, UK politics, U.S. essentials (three stories), technology/AI, local government, and conflicts/security.
- Every headline opens the original article in a new tab. Short summaries are publisher excerpts, never invented summaries.
- Specialist sections follow the original sections: Elections & Democracy, Derby & Derbyshire, Public Administration, Self-Hosted & Open Source, Digital Privacy & Security, Economics & Public Finance, Energy & Climate, Science & Discovery, Books & Literature, History & Ideas, Classical & World Music, Gaming & Emulation, Personal Finance & Investing, Health & Longevity, Reading & Digital Libraries, and Home & Sustainable Living.
- Stories appear only in the first visible section that selects them, starting with Top stories. Preferences can reorder or hide sections. Specialist matching uses headline, excerpt, feed categories and publisher paths; niche sections may be sparse until suitable feeds are added in Sources. Cached headlines are also classified on upgrade.
- Preferences controls appearance, compact cards, read-story visibility, section order, publishers, muted words, followed topics, and a preferred region.
- Settings, saved stories, and read status are shared across devices. “Since your last visit” uses the previous visit timestamp stored in each browser.
- Search covers stored headlines and summaries; use All history, source, and date filters. Search returns up to 100 grouped results.
- Stories older than the configured retention period are removed unless saved. Saved articles remain as links/excerpts, not offline copies of publisher articles.
- Sources enables/disables feeds, reports their last successful checks, and validates custom HTTPS feeds. Add your local BBC or council feed here. Label council/official announcements explicitly; they are not independent reporting.

## Source policy and limitations

Dedicated BBC Derbyshire, Guardian science/books/classical music/money/environment/health, and Ars gaming feeds support the specialist sections. Additional specialist defaults include Democracy Club, UCL Constitution Unit, Quanta Magazine, Carbon Brief, NIHR Evidence, EFF, GamingOnLinux, Public Domain Review, Public Books, Literary Hub, Energy Saving Trust, The Violin Channel, Bank of England, and Monevator. EFF provides a digital-rights advocacy perspective; Monevator publishes investing commentary with commercial links. Reader mode preserves available page text, including podcast notes or livestream descriptions, rather than embedded media or linked documents.

Defaults include BBC, Sky, Guardian reporting, DW, France 24, The Register, LocalGov, ProPublica, Ars Technica, BleepingComputer, POLITICO Europe, City A.M., NPR, and Al Jazeera. Feed endpoint availability varies and is visible in Sources. No publisher is entirely neutral. Broadcaster and international diversity complements Guardian coverage; this is not a guaranteed left/right balance and does not include a vetted centre-right newspaper yet.

Opinion, sponsored, and premium markers are excluded where supplied. Publishers can change access rules, and a freely available RSS excerpt does not guarantee the linked article is free. There is no paywall bypass or full-page scraping. Disable a publisher if its links become restricted. Custom feeds should be checked for free article access and personal-use terms before adding.

BBC feed information: https://support.bbc.co.uk/platform/feeds/NewsFeeds.htm
Sky feeds: https://news.sky.com/info/rss
Guardian feeds: https://www.theguardian.com/help/feeds
The Register feeds: https://www.theregister.com/design/page/feeds

Only titles, attributed excerpts (up to 320 characters), dates, and original links are stored. Images are omitted. This is intended for private, personal use; review current publisher terms before any public hosting or redistribution.

Classification uses transparent keyword rules in `src/news.js`. U.S. essentials selects major-policy keywords but is not a human editor. Top stories favours the BBC top-feed positions and recent UK/world coverage; it does not claim automatic breaking-news verification. Similar headlines within 18 hours are conservatively grouped; grouping may miss duplicates or occasionally combine related reports. “Other coverage” does not establish independent corroboration, since outlets may use the same agency material. Source limits can result in fewer cards when only one publisher is available.

## Resource use

One process, built-in SQLite, no browser automation, AI, image downloads, or Redis/PostgreSQL. Feeds are fetched sequentially with conditional requests, 12-second socket timeouts, a 2 MB response limit, and at most 60 entries per feed. At most 64 feeds can be configured. Queries scan at most the newest 3,000 retained articles; the default landing page uses the last 48 hours. Database writes are batched per feed. Docker limits the container to 256 MB RAM and 0.75 CPU; these are limits, not measured usage guarantees. Logs rotate at 5 MB × 2.

Use `docker stats --no-stream` to inspect your actual workload. Increase memory in `compose.yaml` only if your feed workload needs it. There is no refresh overlap. Network/DNS outages preserve cached stories.

## Backup, restore, and upgrades

In Sources, click **Download backup** to obtain a consistent SQLite database. Store a copy outside the Pi. Preferences also have JSON export/import.

To restore, stop the application and copy the database into the named volume. From the folder containing your backup, with the Compose project running initially:

```sh
docker compose stop news
docker compose run --rm --no-deps --user root -v "$PWD:/backup:ro" news sh -c 'cp /backup/quiet-news.sqlite /app/data/news.sqlite && rm -f /app/data/news.sqlite-wal /app/data/news.sqlite-shm && chown node:node /app/data/news.sqlite'
docker compose up -d
```

Restore only your own trusted backup. This replaces the current database. Download a backup first if you want to retain the current state.

To upgrade, download a backup, then run `./scripts/deploy` from your Mac. The script copies updated project files and rebuilds the container; the persistent volume stays intact.

## Development without Docker

Requires Node.js 24 or newer:

```sh
npm ci
npm test
npm start
```

Open http://localhost:2468. The database is in `data/`; change with `DATA_DIR`. `PORT`, `UPDATE_MINUTES`, `RETENTION_DAYS`, `AUTH_USER`, and `AUTH_PASSWORD` are supported environment variables. `DISABLE_COLLECTOR=1` disables external fetching for offline development.

The server blocks custom feeds resolving to private network addresses, enforces same-origin mutation requests, and serves no third-party scripts. Do not treat that as a substitute for keeping Docker/Node updated and restricting network exposure.

## Reader mode

Article tiles open a text-only reader in a new tab by default. The **Open original** button and the dashboard's **Read at source** link always offer publisher access. Preferences has a global reader-mode switch. Sources → Reader mode exceptions lets you make individual publishers open directly.

If extraction fails, the fallback offers **Always open this source directly**. Check it and choose **Open original article** to persist the exception across your devices. You can undo it in Sources. If saving fails, the reader reports it rather than claiming the setting was saved.

Extraction happens only on demand, with one extraction at a time, a 2 MB HTML limit, 15-second request deadline per redirect hop, and a 10-second/64 MB extraction worker limit. There is no headless browser or publisher JavaScript execution. Article text is rendered as text nodes, with no publisher HTML/scripts/images embedded. Failed extraction results are cached for five minutes; successful results for one day. Saved articles keep successful cached text until cache eviction. The cache is capped at **200 articles**, prioritising saved articles, so saved text is not an unlimited permanent archive. Backups include cached reader content.

Reader mode does not bypass authentication or paywalls. Clearly marked restricted pages and very short extracts are rejected. Extraction can still produce incomplete text on some publishers, especially live blogs or dynamic pages; Open original remains available. Publisher permissions and access rules apply to personal reading and caching.
