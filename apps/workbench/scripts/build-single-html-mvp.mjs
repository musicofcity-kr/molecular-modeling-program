import { readdir, readFile, rm, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const intermediateDir = path.join(appRoot, '.single-html-build');
const outputDir = path.join(appRoot, 'dist-single');
const outputFile = path.join(outputDir, 'molecule-modeling-workbench-mvp.single.html');

function escapeInlineScript(value) {
  return value.replaceAll('</script', '<\\/script');
}

function toBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

async function findFirstFile(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = await findFirstFile(entryPath, predicate);
      if (nested) {
        return nested;
      }
    } else if (predicate(entryPath)) {
      return entryPath;
    }
  }

  return null;
}

async function main() {
  await rm(intermediateDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  await build({
    root: appRoot,
    base: './',
    publicDir: 'public',
    build: {
      outDir: intermediateDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      minify: 'esbuild',
      sourcemap: false,
      target: 'es2020',
      chunkSizeWarningLimit: 60000,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          entryFileNames: 'assets/app.js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  });

  const jsFile = path.join(intermediateDir, 'assets', 'app.js');
  const cssFile = await findFirstFile(path.join(intermediateDir, 'assets'), (filePath) =>
    filePath.endsWith('.css'),
  );
  const rdkitJsFile = path.join(intermediateDir, 'rdkit', 'RDKit_minimal.js');
  const rdkitWasmFile = path.join(intermediateDir, 'rdkit', 'RDKit_minimal.wasm');

  let appJs = await readFile(jsFile, 'utf8');
  const appCss = cssFile ? await readFile(cssFile, 'utf8') : '';
  const rdkitJsBase64 = toBase64(await readFile(rdkitJsFile));
  const rdkitWasmBase64 = toBase64(await readFile(rdkitWasmFile));

  appJs = appJs
    .replaceAll('"/rdkit/RDKit_minimal.js"', 'window.__MMP_SINGLE_ASSETS__.rdkitJsUrl')
    .replaceAll('"/rdkit/RDKit_minimal.wasm"', 'window.__MMP_SINGLE_ASSETS__.rdkitWasmUrl');

  const remainingAssetRefs = [
    '/rdkit/RDKit_minimal.js',
    '/rdkit/RDKit_minimal.wasm',
    'import("./',
    'from"./',
  ].filter((marker) => appJs.includes(marker));

  if (remainingAssetRefs.length > 0) {
    throw new Error(`Single HTML bundle still contains external markers: ${remainingAssetRefs.join(', ')}`);
  }

  const bootstrap = `
window.global = window.global || window;
window.process = window.process || {
  env: { NODE_DEBUG: "" },
  emitWarning: console.warn.bind(console),
  nextTick: function (callback) {
    var args = Array.prototype.slice.call(arguments, 1);
    Promise.resolve().then(function () {
      callback.apply(null, args);
    });
  },
  pid: 0,
  stderr: {
    isTTY: false,
    columns: 80,
    getColorDepth: function () {
      return 1;
    }
  }
};
window.__MMP_SINGLE_ASSETS__ = {
  rdkitJsUrl: "data:text/javascript;base64,${rdkitJsBase64}",
  rdkitWasmUrl: "data:application/wasm;base64,${rdkitWasmBase64}"
};
`;

  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:," />
    <title>다양한 분자의 분자구조 모델링 - Single HTML MVP</title>
    <style>${appCss}</style>
    <script>${escapeInlineScript(bootstrap)}</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${escapeInlineScript(appJs)}</script>
  </body>
</html>
`;

  await writeFile(outputFile, html, 'utf8');
  await rm(intermediateDir, { recursive: true, force: true });

  const { size } = await stat(outputFile);
  const sizeMiB = (size / 1024 / 1024).toFixed(2);

  console.log(`Created ${outputFile}`);
  console.log(`Size: ${sizeMiB} MiB`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
