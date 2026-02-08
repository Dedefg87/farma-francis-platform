#!/usr/bin/env node

/**
 * Test Evolution API Webhook Connection
 * 
 * Run this script to test if the webhook is receiving messages correctly.
 * Usage: node test-evolution-webhook.js
 */

const http = require('http');

const BASE_URL = process.env.TEST_URL || 'https://innovative-enjoyment-production-ed8f.up.railway.app';

async function testWebhook() {
  console.log('🧪 Testing Evolution API Webhook Connection');
  console.log('='.repeat(50));
  console.log(`URL: ${BASE_URL}/api/webhooks/evolution`);
  console.log('');

  // Test 1: Health check
  console.log('📋 Test 1: Health Check');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/test/health`);
    const healthData = await healthRes.json();
    console.log(`   Status: ${healthData.success ? '✅ OK' : '❌ FAIL'}`);
    if (healthData.health) {
      console.log(`   Database: ${healthData.health.database}`);
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }
  console.log('');

  // Test 2: Send a test webhook payload (simulate Evolution API)
  console.log('📋 Test 2: Send Test Webhook Payload');
  
  const testPayload = {
    event: "messages.upsert",
    data: {
      key: {
        id: `test-${Date.now()}`,
        remoteJid: "5511999999999@s.whatsapp.net",
        fromMe: false
      },
      pushName: "Test User",
      message: {
        conversation: "Olá, isso é um teste!"
      },
      messageTimestamp: Math.floor(Date.now() / 1000)
    }
  };

  try {
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/evolution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log(`   Response Status: ${webhookRes.status}`);
    console.log(`   Response Body: ${await webhookRes.text()}`);
    
    if (webhookRes.ok) {
      console.log('   ✅ Webhook endpoint is reachable!');
    } else {
      console.log('   ❌ Webhook returned error');
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
  console.log('');

  // Test 3: Check messages
  console.log('📋 Test 3: Check Received Messages');
  try {
    const messagesRes = await fetch(`${BASE_URL}/api/test/messages?limit=5`);
    const messagesData = await messagesRes.json();
    console.log(`   Status: ${messagesData.success ? '✅ OK' : '❌ FAIL'}`);
    if (messagesData.messages) {
      console.log(`   Total Messages: ${messagesData.messages.length}`);
      messagesData.messages.forEach(m => {
        console.log(`   - [${m.provider}] ${m.fromNumber}: ${m.messageText || '(media)'}`);
      });
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }
  console.log('');

  // Test 4: Check debug logs
  console.log('📋 Test 4: Check Debug Logs');
  try {
    const logsRes = await fetch(`${BASE_URL}/api/test/logs`);
    const logsData = await logsRes.json();
    console.log(`   Status: ${logsData.success ? '✅ OK' : '❌ FAIL'}`);
    console.log(`   Log Count: ${logsData.count || 0}`);
    if (logsData.logs && logsData.logs.length > 0) {
      console.log('   Recent Logs:');
      logsData.logs.slice(-5).forEach(log => {
        console.log(`   - [${log.level}] ${log.category}: ${log.message}`);
      });
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }
  console.log('');

  console.log('='.repeat(50));
  console.log('📝 Instructions:');
  console.log('1. Make sure Evolution API is configured to send webhooks to:');
  console.log(`   ${BASE_URL}/api/webhooks/evolution`);
  console.log('');
  console.log('2. In Evolution API, configure the webhook URL in:');
  console.log('   Instance Settings → Webhook → URL');
  console.log('');
  console.log('3. Enable these events in Evolution API:');
  console.log('   - messages.upsert');
  console.log('   - contacts.upsert');
}

testWebhook().catch(console.error);
