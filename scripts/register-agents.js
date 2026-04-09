#!/usr/bin/env node
/**
 * register-agents.js
 *
 * Registers / updates all agents in the Firestore `agents` collection.
 * Called by the CI/CD pipeline after a successful agent-platform deploy.
 *
 * Idempotent: uses Firestore set({ merge: true }) so it creates or updates.
 *
 * Environment variables (all required in CI):
 *   GCP_SA_KEY        — Full service account JSON string (from GitHub secret)
 *   GCP_PROJECT_ID    — GCP project ID
 *   CLOUD_RUN_REGION  — e.g. "asia-south1"
 *   SERVICE_NAME      — Cloud Run service name, e.g. "agent-platform"
 *
 * Agent metadata is read from ./agents-config.json (see that file for schema).
 * The Cloud Run service URL is fetched dynamically via the GCP REST API.
 */

'use strict';

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue }  = require('firebase-admin/firestore');
const https = require('https');

// ─── Config ──────────────────────────────────────────────────────────────────

const PROJECT_ID   = requireEnv('GCP_PROJECT_ID');
const REGION       = requireEnv('CLOUD_RUN_REGION');
const SERVICE_NAME = requireEnv('SERVICE_NAME');

const saKey = JSON.parse(requireEnv('GCP_SA_KEY'));

// ─── Init Firebase Admin ─────────────────────────────────────────────────────

initializeApp({ credential: cert(saKey), projectId: PROJECT_ID });
const db = getFirestore();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireEnv(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`ERROR: Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return val;
}

/**
 * Fetch the Cloud Run service URL via the GCP REST API.
 * Uses the service account token from the environment.
 */
function getCloudRunUrl(accessToken) {
  return new Promise((resolve, reject) => {
    const path = `/v2/projects/${PROJECT_ID}/locations/${REGION}/services/${SERVICE_NAME}`;
    const options = {
      hostname: 'run.googleapis.com',
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Cloud Run API ${res.statusCode}: ${body}`));
          return;
        }
        const svc = JSON.parse(body);
        // Cloud Run v2 returns `uri` at the top level
        const url = svc.urls?.[0] || svc.uri;
        if (!url) reject(new Error('Could not find service URL in Cloud Run response'));
        else resolve(url);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Exchange service account credentials for a short-lived access token
 * using the GCP metadata-less token endpoint (jwt grant).
 */
async function getAccessToken() {
  // firebase-admin already holds SA credentials — tap its internal token cache.
  // The Admin SDK exposes this via app.options.credential.getAccessToken().
  const { getApp } = require('firebase-admin/app');
  const token = await getApp().options.credential.getAccessToken();
  return token.access_token;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 Registering agents for project: ${PROJECT_ID}\n`);

  // Load agent metadata definitions
  const agents = require('./agents-config.json');

  // Resolve Cloud Run service URL
  let serviceUrl;
  try {
    const token = await getAccessToken();
    serviceUrl = await getCloudRunUrl(token);
    console.log(`✔  Cloud Run URL: ${serviceUrl}`);
  } catch (err) {
    // Non-fatal: if the URL fetch fails, store without endpoint.
    // AGENT_SYNC_ON_STARTUP=true in the container will set it correctly.
    console.warn(`⚠  Could not fetch Cloud Run URL: ${err.message}`);
    console.warn('   Continuing without endpoint field.');
    serviceUrl = null;
  }

  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  const results = [];

  for (const [agentId, metadata] of Object.entries(agents)) {
    const docRef = db.collection('agents').doc(agentId);

    const payload = {
      ...metadata,
      id: agentId,
      updatedAt: now,
      deployedBy: 'cicd',
      deployCommit: process.env.GITHUB_SHA || 'unknown',
    };

    // Only set endpoint if we successfully resolved it
    if (serviceUrl) {
      payload.endpoint = serviceUrl;
    }

    batch.set(docRef, payload, { merge: true });
    results.push(agentId);
  }

  await batch.commit();

  console.log(`\n✅ Registered ${results.length} agent(s):`);
  results.forEach((id) => console.log(`   • ${id}`));
  console.log('');
}

main().catch((err) => {
  console.error('Registration failed:', err);
  process.exit(1);
});
