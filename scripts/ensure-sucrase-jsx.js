#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sucraseVendorRoot = path.join(projectRoot, 'patches', 'sucrase');
const sucraseTargets = [
  {
    from: path.join(sucraseVendorRoot, 'dist', 'parser', 'plugins', 'jsx', 'index.js'),
    to: path.join(projectRoot, 'node_modules', 'sucrase', 'dist', 'parser', 'plugins', 'jsx', 'index.js'),
  },
  {
    from: path.join(sucraseVendorRoot, 'dist', 'parser', 'plugins', 'jsx', 'xhtml.js'),
    to: path.join(projectRoot, 'node_modules', 'sucrase', 'dist', 'parser', 'plugins', 'jsx', 'xhtml.js'),
  },
  {
    from: path.join(sucraseVendorRoot, 'dist', 'esm', 'parser', 'plugins', 'jsx', 'index.js'),
    to: path.join(projectRoot, 'node_modules', 'sucrase', 'dist', 'esm', 'parser', 'plugins', 'jsx', 'index.js'),
  },
  {
    from: path.join(sucraseVendorRoot, 'dist', 'esm', 'parser', 'plugins', 'jsx', 'xhtml.js'),
    to: path.join(projectRoot, 'node_modules', 'sucrase', 'dist', 'esm', 'parser', 'plugins', 'jsx', 'xhtml.js'),
  },
];
const reactRemoveScrollVendorRoot = path.join(projectRoot, 'patches', 'react-remove-scroll', 'dist');
const reactRemoveScrollTargets = [
  {
    from: path.join(reactRemoveScrollVendorRoot, 'es2015'),
    to: path.join(
      projectRoot,
      'node_modules',
      '@radix-ui',
      'react-select',
      'node_modules',
      'react-remove-scroll',
      'dist',
      'es2015'
    ),
  },
  {
    from: path.join(reactRemoveScrollVendorRoot, 'es2019'),
    to: path.join(
      projectRoot,
      'node_modules',
      '@radix-ui',
      'react-select',
      'node_modules',
      'react-remove-scroll',
      'dist',
      'es2019'
    ),
  },
  {
    from: path.join(reactRemoveScrollVendorRoot, 'es5'),
    to: path.join(
      projectRoot,
      'node_modules',
      '@radix-ui',
      'react-select',
      'node_modules',
      'react-remove-scroll',
      'dist',
      'es5'
    ),
  },
];

function shouldPatch(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return !stats.isFile() || stats.size === 0;
  } catch {
    return true;
  }
}

function copyIfMissing({from, to}) {
  if (!fs.existsSync(from)) {
    console.warn(`[sucrase-patch] Missing vendor file: ${from}`);
    return false;
  }
  const targetDir = path.dirname(to);
  if (!fs.existsSync(targetDir)) {
    return false;
  }
  if (!shouldPatch(to)) {
    return false;
  }
  fs.mkdirSync(targetDir, {recursive: true});
  fs.copyFileSync(from, to);
  return true;
}

function directoryNeedsPatch(dir) {
  try {
    const stats = fs.statSync(dir);
    if (!stats.isDirectory()) return true;
    return fs.readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}

function copyDirectory({from, to}) {
  if (!fs.existsSync(from)) {
    console.warn(`[react-remove-scroll-patch] Missing vendor directory: ${from}`);
    return false;
  }
  if (!directoryNeedsPatch(to)) {
    return false;
  }
  fs.rmSync(to, {recursive: true, force: true});
  fs.mkdirSync(path.dirname(to), {recursive: true});
  fs.cpSync(from, to, {recursive: true});
  return true;
}

const patchedSucrase = sucraseTargets.filter(copyIfMissing);
if (patchedSucrase.length > 0) {
  console.log(`[sucrase-patch] Restored ${patchedSucrase.length} sucrase JSX file${patchedSucrase.length > 1 ? 's' : ''}.`);
}

const patchedRemoveScroll = reactRemoveScrollTargets.filter(copyDirectory);
if (patchedRemoveScroll.length > 0) {
  console.log(
    `[react-remove-scroll-patch] Restored ${patchedRemoveScroll.length} build director${patchedRemoveScroll.length > 1 ? 'ies' : 'y'}.`
  );
}
