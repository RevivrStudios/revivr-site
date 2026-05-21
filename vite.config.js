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

export default defineConfig({
  build: {
    rollupOptions: {
      input: htmlFiles,
    },
  },
});
