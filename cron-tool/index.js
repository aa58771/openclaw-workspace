#!/usr/bin/env node
/**
 * Simple Cron-like Scheduler
 * Usage: node cron-tool.js "schedule" "command"
 * 
 * Schedule format: 
 *   * * * * * = every minute
 *   0 8 * * * = every day at 8am
 *   0 8 * * 1-5 = weekdays at 8am
 */

const cron = require('node-cron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const JOBS_FILE = path.join(process.env.HOME || '/home/node', '.openclaw', 'cron-jobs.json');

// Load jobs
function loadJobs() {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

// Save jobs
function saveJobs(jobs) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

// List jobs
function listJobs() {
  const jobs = loadJobs();
  if (Object.keys(jobs).length === 0) {
    console.log('No scheduled jobs.');
    return;
  }
  console.log('Scheduled jobs:');
  for (const [name, job] of Object.entries(jobs)) {
    console.log(`- ${name}: ${job.schedule} => ${job.command}`);
  }
}

// Add job
function addJob(name, schedule, command) {
  const jobs = loadJobs();
  
  // Validate schedule
  if (!cron.validate(schedule)) {
    console.log(`Invalid schedule: ${schedule}`);
    return;
  }
  
  // Schedule the job
  const task = cron.schedule(schedule, () => {
    console.log(`[${new Date().toISOString()}] Running: ${command}`);
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const child = spawn(cmd, args, { shell: true });
    child.stdout.on('data', d => console.log(d.toString()));
    child.stderr.on('data', d => console.error(d.toString()));
  });
  
  jobs[name] = { schedule, command, active: true };
  saveJobs(jobs);
  console.log(`Job "${name}" scheduled: ${schedule}`);
}

// Remove job
function removeJob(name) {
  const jobs = loadJobs();
  if (jobs[name]) {
    delete jobs[name];
    saveJobs(jobs);
    console.log(`Job "${name}" removed.`);
  } else {
    console.log(`Job "${name}" not found.`);
  }
}

// Main
const args = process.argv.slice(2);
const action = args[0];

if (action === 'list') {
  listJobs();
} else if (action === 'add' && args[3]) {
  addJob(args[1], args[2], args[3]);
} else if (action === 'remove' && args[1]) {
  removeJob(args[1]);
} else if (action === 'help') {
  console.log(`
Simple Cron Tool

Usage:
  cron-tool list                    - List all scheduled jobs
  cron-tool add <name> <schedule> <command>  - Add a job
  cron-tool remove <name>          - Remove a job
  cron-tool help                   - Show this help

Schedule format:
  * * * * * = every minute
  0 8 * * * = every day at 8am
  0 8 * * 1-5 = weekdays at 8am

Example:
  node cron-tool.js add mytask "0 8 * * *" "echo 'Good morning!'"
`);
} else {
  console.log('Usage: cron-tool <list|add|remove|help>');
  console.log('Try: cron-tool help');
}
