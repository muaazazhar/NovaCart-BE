#!/usr/bin/env node
/**
 * Seed runner — uses compiled JS in production, ts-node in local dev.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const compiledSeed = path.join(__dirname, '../../dist/seed/index.js');

function canUseTsNode() {
  try {
    require.resolve('ts-node/register');
    return true;
  } catch {
    return false;
  }
}

if (fs.existsSync(compiledSeed) && (process.env.NODE_ENV === 'production' || !canUseTsNode())) {
  require(compiledSeed);
} else if (canUseTsNode()) {
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'CommonJS' });
  require('ts-node/register');
  require('./index.ts');
} else {
  console.error(
    'Seed bundle missing. Run "npm run build:seed" locally, or redeploy so dist/seed is built.',
  );
  process.exit(1);
}
