import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function ketcherRequireShimChunk(): Plugin {
  return {
    name: 'ketcher-require-shim-chunk',
    renderChunk(code, chunk) {
      const hasKetcherModule = Object.keys(chunk.modules).some((moduleId) =>
        moduleId.includes('node_modules/ketcher-'),
      );

      if (!hasKetcherModule) {
        return null;
      }

      return {
        code: `var require = globalThis.require;\n${code}`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), ketcherRequireShimChunk()],
});
