import './globals.css';
import Sidebar from './components/Sidebar';

export const metadata = {
  title: 'Revivr Online Operations',
  description: 'Internal operations hub for Revivr Studios — vault diagnostics, agent coordination, and prompt management.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
