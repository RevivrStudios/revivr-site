# ⚠️ CRITICAL ICLOUD WARNING ⚠️

**NEVER RUN `npm install`, `npm run dev`, OR `npm run build` IN THIS DIRECTORY!**

This directory is the **Canonical Source** for the Vault Dashboard. It is synced via iCloud to both the MiniTower and MacRevivr-Studio.

Next.js generates tens of thousands of tiny files in `node_modules` and `.next`. If these are created inside an iCloud-synced folder, they will **catastrophically choke the iCloud sync engine**, spike CPU usage, and cause EAGAIN (-11) file errors across the entire vault.

### How to Deploy
Do not run the server here. Instead, use the provided deployment script to sync these source files to an external runtime directory safely outside of iCloud:

```bash
./deploy-dashboard.sh
```

**Host-Specific Runtime Paths:**
- **MacRevivr-Studio.local:** `~/Library/Application Support/Revivr/VaultDashboard`
- **MiniTower.local:** `/Volumes/Sureal Drive/RevivrOperations`
