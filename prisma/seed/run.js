#!/usr/bin/env node
/**
 * Seed runner — loads dotenv and executes the TypeScript seed with CommonJS.
 */
require('dotenv').config();
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'CommonJS' });
require('ts-node/register');
require('./index.ts');
