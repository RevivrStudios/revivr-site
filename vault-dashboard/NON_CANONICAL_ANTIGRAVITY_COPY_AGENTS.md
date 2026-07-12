# Non-Canonical Dashboard Copy

This folder is not the Revivr Operations Dashboard source of truth.

Canonical dashboard:

- Host: `MiniTower`
- URL: `http://minitower.local:3000`
- Source: `/Volumes/Sureal Drive/Revivr Site /vault-dashboard`
- Service: `com.revivr.vault-dashboard`

Do not edit, build, or serve this copy. Do not run `npm start`, `npm run dev`, `npm run build`, or `launch-dashboard.sh` from this folder.

If asked to change the dashboard, work only in:

```zsh
/Volumes/Sureal Drive/Revivr Site /vault-dashboard
```

After changes, rebuild and restart only the canonical MiniTower service:

```zsh
cd "/Volumes/Sureal Drive/Revivr Site /vault-dashboard"
npm run build
launchctl kickstart -k "gui/$(id -u)/com.revivr.vault-dashboard"
```
