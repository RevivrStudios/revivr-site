import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Dynamically gather all HTML files in root and language subdirectories
const htmlFiles = {};
function getHtmlFiles(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    // Skip node_modules, dist, and hidden directories
    if (file === 'node_modules' || file === 'dist' || file.startsWith('.')) continue;
    
    const path = resolve(dir, file);
    if (fs.statSync(path).isDirectory()) {
      // Only process language directories and root
      if (['es', 'fr', 'ja'].includes(file)) {
        getHtmlFiles(path, `${prefix}${file}_`);
      }
    } else if (file.endsWith('.html')) {
      const name = file.replace('.html', '');
      htmlFiles[`${prefix}${name}`] = path;
    }
  }
}
getHtmlFiles(__dirname);

// Vite's public-file middleware does not resolve directory indexes before its
// homepage fallback. Match Firebase's directory URLs for the standalone demos.
const experiencePaths = new Set([
  '/openspace', '/lookandsay', '/lanternlake', '/mriprep', '/northerncalm',
]);

export default defineConfig({
  plugins: [{
    name: 'public-experience-indexes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !['GET', 'HEAD'].includes(req.method)) return next();
        const url = new URL(req.url, 'http://localhost');
        const path = url.pathname.replace(/\/$/, '');
        if (!experiencePaths.has(path)) return next();
        if (!url.pathname.endsWith('/')) {
          res.writeHead(308, { Location: `${path}/${url.search}` });
          return res.end();
        }
        req.url = `${path}/index.html${url.search}`;
        next();
      });
    },
  }],
  build: {
    rollupOptions: {
      input: htmlFiles,
    },
  },
});
