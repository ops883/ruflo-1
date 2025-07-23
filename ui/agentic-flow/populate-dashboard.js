#!/usr/bin/env node

// Script to populate the dashboard with sample data

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function populateDashboard() {
  console.log('🚀 Populating Dashboard with Sample Data...\n');
  
  try {
    // 1. Initialize swarm
    console.log('1️⃣ Initializing HiveMind swarm...');
    const initResponse = await fetch(`${API_BASE}/api/hive/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Neural-Research-Swarm',
        topology: 'hierarchical',
        maxAgents: 10,
        strategy: 'adaptive'
      })
    });
    const swarmData = await initResponse.json();
    console.log(`✅ Swarm initialized: ${swarmData.name}\n`);
    
    // 2. Spawn various agent types
    console.log('2️⃣ Spawning diverse agent team...');
    const agentConfigs = [
      { type: 'coordinator', name: 'LEAD-COORD' },
      { type: 'researcher', name: 'DATA-SCOUT-1' },
      { type: 'researcher', name: 'DATA-SCOUT-2' },
      { type: 'coder', name: 'CODE-FORGE-1' },
      { type: 'coder', name: 'CODE-FORGE-2' },
      { type: 'architect', name: 'SYSTEM-ARCH' },
      { type: 'analyst', name: 'PERF-ANALYZER' },
      { type: 'tester', name: 'QA-GUARDIAN' },
    ];
    
    for (const config of agentConfigs) {
      const response = await fetch(`${API_BASE}/api/hive/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          autoAssign: true
        })
      });
      const agent = await response.json();
      console.log(`✅ Spawned ${config.type}: ${agent.name}`);
    }
    
    console.log('\n3️⃣ Submitting diverse tasks...');
    const tasks = [
      { description: 'Design microservices architecture', priority: 'critical' },
      { description: 'Implement JWT authentication system', priority: 'high' },
      { description: 'Analyze database query performance', priority: 'high' },
      { description: 'Research latest AI model optimizations', priority: 'medium' },
      { description: 'Write comprehensive unit test suite', priority: 'medium' },
      { description: 'Document API endpoints', priority: 'low' },
      { description: 'Optimize neural network training', priority: 'high' },
      { description: 'Review security vulnerabilities', priority: 'critical' },
    ];
    
    for (const taskData of tasks) {
      const response = await fetch(`${API_BASE}/api/hive/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          strategy: 'adaptive'
        })
      });
      const task = await response.json();
      console.log(`✅ Task: ${task.description} [${task.priority.toUpperCase()}]`);
    }
    
    console.log('\n✨ Dashboard populated successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Swarm: ${swarmData.name}`);
    console.log(`   - Topology: ${swarmData.topology}`);
    console.log(`   - Agents: ${agentConfigs.length}`);
    console.log(`   - Tasks: ${tasks.length}`);
    console.log('\n🎯 Open http://localhost:5173 to see the populated dashboard!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

populateDashboard();