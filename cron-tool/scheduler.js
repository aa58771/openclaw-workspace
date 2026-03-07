#!/usr/bin/env node
/**
 * Persistent Cron Scheduler Daemon
 * Reads cron-jobs.json and starts all active jobs using node-cron.
 * Stays alive as a background process.
 */

const cron = require('node-cron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const JOBS_FILE = path.join(process.env.HOME || '/home/node', '.openclaw', 'cron-jobs.json');
const LOG_PREFIX = '[cron-scheduler]';

function log(msg) {
  console.log(`${LOG_PREFIX} [${new Date().toISOString()}] ${msg}`);
}

// === Memory Restore on Startup ===
function restoreMemory() {
  const restoreScript = path.join(__dirname, 'restore_memory.sh');
  if (fs.existsSync(restoreScript)) {
    log('Running memory restore before starting scheduler...');
    const restore = spawn('bash', [restoreScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    restore.stdout.on('data', d => process.stdout.write(`[restore] ${d.toString()}`));
    restore.stderr.on('data', d => process.stderr.write(`[restore] ${d.toString()}`));
    restore.on('close', code => {
      if (code === 0) {
        log('Memory restore completed successfully');
      } else {
        log(`Memory restore exited with code ${code}, continuing anyway...`);
      }
    });
  } else {
    log('No restore_memory.sh found, skipping');
  }
}
// ===

function loadJobs() {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
    }
  } catch (e) {
    log(`Error loading jobs: ${e.message}`);
  }
  return {};
}

function runCommand(name, command) {
  log(`Running job "${name}": ${command}`);
  const child = spawn('sh', ['-c', command], { 
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' }
  });
  child.stdout.on('data', d => log(`[${name}:stdout] ${d.toString().trim()}`));
  child.stderr.on('data', d => log(`[${name}:stderr] ${d.toString().trim()}`));
  child.on('close', code => log(`Job "${name}" exited with code ${code}`));
}

// Main: load all jobs and schedule them
restoreMemory(); // Restore memory from GitHub before starting jobs

const jobs = loadJobs();
const jobNames = Object.keys(jobs);

if (jobNames.length === 0) {
  log('No jobs found. Exiting.');
  process.exit(0);
}

let scheduled = 0;
for (const [name, job] of Object.entries(jobs)) {
  if (!job.active) {
    log(`Skipping inactive job: ${name}`);
    continue;
  }
  if (!cron.validate(job.schedule)) {
    log(`Invalid schedule for "${name}": ${job.schedule}, skipping.`);
    continue;
  }
  cron.schedule(job.schedule, () => runCommand(name, job.command), {
    timezone: 'Asia/Taipei'
  });
  log(`Scheduled "${name}": ${job.schedule} => ${job.command}`);
  scheduled++;
}

log(`Daemon started. ${scheduled} job(s) scheduled. Waiting for triggers...`);

// Keep alive
process.on('SIGTERM', () => { log('Received SIGTERM, shutting down.'); process.exit(0); });
process.on('SIGINT', () => { log('Received SIGINT, shutting down.'); process.exit(0); });
