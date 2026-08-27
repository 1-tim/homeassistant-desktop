# Home Assistant Desktop

A tiny, open-source (MIT) Electron wrapper that runs a **self-hosted Home Assistant**
instance in its own desktop window — own icon, taskbar/Start entry, remembers window
size, opens external links in the real browser. No third-party services, no telemetry;
it only loads the URL you configure.

Built as an open alternative to the closed-source "HomeAssistant Local" Store app.

## Configure

Edit `config.json`:

```json
{ "url": "http://10.2.4.97:8123" }
```

(This machine's HA is `http://10.2.4.97:8123`, a.k.a. `homeassistant.local:8123`.)

## Run from source

```powershell
npm install
npm start
```

## Build a Windows installer

```powershell
npm run dist
```

Produces an NSIS installer under `dist/` that adds a **Home Assistant** Start-menu and
desktop shortcut with a proper icon.

## Notes

- A **⚙ menu** sits on the top bar with Reload, Home, Back/Forward, Zoom, Full Screen, DevTools and Quit.
- **Zoom** (⚙ → Zoom In/Out/Reset, or `Ctrl` `+` / `-` / `0`, or `Ctrl`+scroll) is **saved and stays put** across restarts.
- `contextIsolation` on, `nodeIntegration` off — the HA page runs sandboxed with no Node access.
- Window size/position and zoom persist in `window-state.json` under the app's userData dir.
- Shortcuts: `Ctrl+R` reload, `Ctrl+Shift+H` home, `Alt+←/→` back/forward, `F11` fullscreen.
