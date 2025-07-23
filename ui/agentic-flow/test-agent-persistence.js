#!/usr/bin/env node

// Test script to verify agent persistence in the swarm

const API_BASE = 'http://localhost:3001';

// Use dynamic import for fetch in Node.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAgentPersistence() {
  console.log('🧪 Testing Agent Persistence in Swarm...\n');
  
  try {
    // 1. Initialize swarm
    console.log('1️⃣ Initializing swarm...');
    const initResponse = await fetch(`${API_BASE}/api/hive/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test-Swarm',
        topology: 'hierarchical',
        maxAgents: 8
      })
    });
    const swarmData = await initResponse.json();
    console.log(`✅ Swarm initialized: ${swarmData.swarmId}\n`);
    
    // 2. Spawn multiple agents
    console.log('2️⃣ Spawning agents...');
    const agentTypes = ['coordinator', 'researcher', 'coder', 'analyst', 'tester'];
    const agents = [];
    
    for (const type of agentTypes) {
      const response = await fetch(`${API_BASE}/api/hive/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name: `${type.toUpperCase()}-${Date.now().toString().slice(-4)}`,
          autoAssign: true
        })
      });
      const agent = await response.json();
      agents.push(agent);
      console.log(`✅ Spawned ${type}: ${agent.name} (${agent.id})`);
    }
    
    console.log(`\n✅ Total agents spawned: ${agents.length}\n`);
    
    // 3. Check immediate status
    console.log('3️⃣ Checking immediate status...');
    let statusResponse = await fetch(`${API_BASE}/api/hive/status`);
    let status = await statusResponse.json();
    console.log(`✅ Agents in swarm: ${status.agents.length}`);
    console.log(`✅ Agent IDs: ${status.agents.map(a => a.id).join(', ')}\n`);
    
    // 4. Submit some tasks
    console.log('4️⃣ Submitting tasks...');
    const tasks = [
      { description: 'Analyze system architecture', priority: 'high' },
      { description: 'Implement authentication', priority: 'critical' },
      { description: 'Write unit tests', priority: 'medium' }
    ];
    
    for (const taskData of tasks) {
      const response = await fetch(`${API_BASE}/api/hive/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const task = await response.json();
      console.log(`✅ Submitted task: ${task.description} (${task.id})`);
    }
    
    console.log('\n5️⃣ Waiting 5 seconds to check persistence...');
    await delay(5000);
    
    // 5. Check status after delay
    console.log('\n6️⃣ Checking status after delay...');
    statusResponse = await fetch(`${API_BASE}/api/hive/status`);
    status = await statusResponse.json();
    
    console.log(`\n📊 Final Status:`);
    console.log(`├── Swarm ID: ${status.swarmId}`);
    console.log(`├── Topology: ${status.topology}`);
    console.log(`├── Health: ${status.health}`);
    console.log(`├── Total Agents: ${status.agents.length}`);
    console.log(`├── Active Agents: ${status.stats.activeAgents}`);
    console.log(`├── Total Tasks: ${status.tasks.length}`);
    console.log(`├── Pending Tasks: ${status.stats.pendingTasks}`);
    console.log(`├── Completed Tasks: ${status.stats.completedTasks}`);
    console.log(`└── Agent Utilization: ${(status.stats.agentUtilization * 100).toFixed(1)}%`);
    
    console.log(`\n🤖 Agent Details:`);
    status.agents.forEach(agent => {
      console.log(`├── ${agent.name} (${agent.type})`);
      console.log(`│   ├── Status: ${agent.status}`);
      console.log(`│   ├── Tasks: ${agent.tasks}`);
      console.log(`│   ├── Performance: ${agent.performance}%`);
      console.log(`│   └── Current Task: ${agent.currentTask || 'None'}`);
    });
    
    console.log(`\n📋 Task Details:`);
    status.tasks.forEach((task, i) => {
      const isLast = i === status.tasks.length - 1;
      console.log(`${isLast ? '└──' : '├──'} ${task.description}`);
      console.log(`${isLast ? '   ' : '│  '} ├── Status: ${task.status}`);
      console.log(`${isLast ? '   ' : '│  '} ├── Priority: ${task.priority}`);
      console.log(`${isLast ? '   ' : '│  '} └── Progress: ${task.progress}%`);
    });
    
    // 6. Test persistence over multiple updates
    console.log('\n7️⃣ Testing persistence over 10 seconds (5 updates)...');
    let persistenceCheck = true;
    const originalAgentCount = status.agents.length;
    
    for (let i = 0; i < 5; i++) {
      await delay(2000);
      const checkResponse = await fetch(`${API_BASE}/api/hive/status`);
      const checkStatus = await checkResponse.json();
      
      console.log(`\n  Check ${i + 1}: ${checkStatus.agents.length} agents`);
      if (checkStatus.agents.length !== originalAgentCount) {
        console.log(`  ❌ Agent count changed! Expected ${originalAgentCount}, got ${checkStatus.agents.length}`);
        persistenceCheck = false;
      } else {
        console.log(`  ✅ Agent count stable`);
      }
      
      // Show agent activity
      const busyAgents = checkStatus.agents.filter(a => a.status === 'busy');
      if (busyAgents.length > 0) {
        console.log(`  🔄 Active agents: ${busyAgents.map(a => a.name).join(', ')}`);
      }
    }
    
    console.log(`\n✨ Test Results:`);
    console.log(`├── Agent Persistence: ${persistenceCheck ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`├── Task Processing: ${status.stats.completedTasks > 0 ? '✅ Working' : '⚠️ No tasks completed yet'}`);
    console.log(`└── Swarm Health: ${status.health === 'healthy' ? '✅ Healthy' : '⚠️ ' + status.health}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAgentPersistence();