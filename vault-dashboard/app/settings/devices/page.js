import { DASHBOARD_TOKEN } from '@/app/lib/config';
import DevicePairing from './DevicePairing';

export const dynamic = 'force-dynamic';

// Server component: reads the token only to expose its last 4 chars as a
// sanity-check affordance. The full token never leaves the server.
export default function DevicesSettingsPage() {
  const token = DASHBOARD_TOKEN.trim();
  const authEnabled = Boolean(token);
  const tokenLast4 = token ? token.slice(-4) : null;

  return (
    <div>
      <div className="page-header">
        <h1>Devices</h1>
        <p className="subtitle">Pair a new device without typing the dashboard token</p>
      </div>
      <DevicePairing authEnabled={authEnabled} tokenLast4={tokenLast4} />
    </div>
  );
}
