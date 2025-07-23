#!/usr/bin/env node

/**
 * Quick test of terminal handler functionality
 */

import { spawn } from 'node-pty';

console.log('🚀 Testing node-pty functionality...');

try {
  // Test if node-pty works
  const ptyProcess = spawn('echo', ['Hello Terminal!'], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env,
  });

  ptyProcess.onData((data) => {
    console.log('📨 PTY Output:', data);
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`✅ Process exited with code ${exitCode}, signal ${signal}`);
    
    // Test claude-flow command availability
    console.log('\n🔍 Testing claude-flow command availability...');
    
    const testClaudeFlow = spawn('which', ['claude-flow'], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env,
    });

    testClaudeFlow.onData((data) => {
      console.log('📍 Claude-flow path:', data.trim());
    });

    testClaudeFlow.onExit(({ exitCode }) => {
      if (exitCode === 0) {
        console.log('✅ claude-flow command is available');
      } else {
        console.log('⚠️ claude-flow command not found in PATH');
        
        // Test via npx
        const testNpx = spawn('npx', ['claude-flow@alpha', '--version'], {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          cwd: process.cwd(),
          env: process.env,
        });
        
        testNpx.onData((data) => {
          console.log('📦 NPX claude-flow output:', data.trim());
        });
        
        testNpx.onExit(() => {
          console.log('✅ Terminal handler test complete');
        });
      }
    });
  });

} catch (error) {
  console.error('❌ Error testing terminal functionality:', error);
  process.exit(1);
}