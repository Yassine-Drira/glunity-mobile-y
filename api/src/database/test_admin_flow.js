'use strict';

/**
 * Admin API End-to-End Test Script
 * 
 * Instructions:
 * Run this script to verify that all admin routes are secure, functional, and correctly
 * interact with MongoDB database records.
 * 
 * Command: node api/src/database/test_admin_flow.js
 */

const http = require('http');

const API_BASE = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin1@glu10.com';
const ADMIN_PASSWORD = 'Password123!';

// Helper function to make request promises
function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, rawBody: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Admin End-to-End API Verification...\n');

  let token = null;

  // 1. Authenticate Admin User
  try {
    console.log(`[AUTH] Attempting login for ${ADMIN_EMAIL}...`);
    const loginRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (loginRes.status !== 200 || !loginRes.body.data?.accessToken) {
      console.error('❌ Authentication failed. Make sure server is running and seeds are populated.');
      console.log('Response status:', loginRes.status, 'Body:', JSON.stringify(loginRes.body));
      process.exit(1);
    }
    
    token = loginRes.body.data.accessToken;
    console.log('✅ Logged in successfully. Token received.\n');
  } catch (err) {
    console.error('❌ Failed to connect to server:', err.message);
    process.exit(1);
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 2. Test Security Guards (Unauthenticated Request)
  console.log('[SECURITY] Testing auth guard blocking unauthenticated requests...');
  const unauthorizedRes = await request(`${API_BASE}/admin/stats`);
  if (unauthorizedRes.status === 401 || unauthorizedRes.status === 403) {
    console.log('✅ Access correctly denied (401/403 unauthenticated).\n');
  } else {
    console.warn(`⚠️ Warning: Expected 401/403 but got status ${unauthorizedRes.status}\n`);
  }

  // 3. Test Dashboard stats for periods
  const periods = ['today', '7d', '30d', '3m', '1y'];
  for (const period of periods) {
    console.log(`[STATS] Fetching stats for period: "${period}"...`);
    const statsRes = await request(`${API_BASE}/admin/stats?period=${period}`, authHeaders);
    if (statsRes.status === 200 && statsRes.body.success) {
      const data = statsRes.body.data;
      console.log(`✅ Success for "${period}":`);
      console.log(`   - Period Label: "${data.periodLabel}"`);
      console.log(`   - New Users: ${data.newUsersInPeriod}`);
      console.log(`   - Total Users: ${data.totalUsers}`);
      console.log(`   - Growth: ${data.usersGrowth}%`);
      console.log(`   - Notifications Count: ${data.platformHealth?.notifications}`);
      console.log(`   - Emails Sent: ${data.platformHealth?.emailsSent}`);
      console.log(`   - DB Status: ${data.platformHealth?.dbStatus} (Latency: ${data.platformHealth?.apiLatency})`);
    } else {
      console.error(`❌ Failed stats for period "${period}": status ${statsRes.status}`);
    }
  }
  console.log('');

  // 4. Test Users Management
  console.log('[USERS] Fetching users list...');
  const usersRes = await request(`${API_BASE}/admin/users?filter=all`, authHeaders);
  if (usersRes.status === 200 && Array.isArray(usersRes.body.data)) {
    const list = usersRes.body.data;
    console.log(`✅ Retrieved ${list.length} users successfully.`);
    if (list.length > 0) {
      const testUser = list[0];
      console.log(`[USERS] Toggling status for user "${testUser.fullName}" (ID: ${testUser.id})...`);
      
      const newStatus = testUser.status === 'active' ? 'suspended' : 'active';
      const toggleRes = await request(`${API_BASE}/admin/users/${testUser.id}/status`, {
        method: 'PATCH',
        ...authHeaders
      }, { status: newStatus });

      if (toggleRes.status === 200) {
        console.log(`✅ Successfully toggled user status to "${newStatus}"!`);
        
        // Restore status
        await request(`${API_BASE}/admin/users/${testUser.id}/status`, {
          method: 'PATCH',
          ...authHeaders
        }, { status: testUser.status });
        console.log('✅ Restored user status back.');
      } else {
        console.error(`❌ Failed to toggle user status: ${toggleRes.status} ${JSON.stringify(toggleRes.body)}`);
      }
    }
  } else {
    console.error('❌ Failed to fetch users list:', usersRes.status);
  }
  console.log('');

  // 5. Test Moderation
  console.log('[MODERATION] Fetching moderation pending items...');
  const modRes = await request(`${API_BASE}/admin/moderation?type=all`, authHeaders);
  if (modRes.status === 200 && Array.isArray(modRes.body.data)) {
    console.log(`✅ Retrieved ${modRes.body.data.length} pending moderation items.`);
  } else {
    console.error('❌ Failed to fetch moderation list:', modRes.status);
    console.log('Error details:', JSON.stringify(modRes.body || modRes.rawBody));
  }
  console.log('');

  // 6. Test Sellers
  console.log('[SELLERS] Fetching pending sellers verifications...');
  const sellersRes = await request(`${API_BASE}/admin/sellers/pending`, authHeaders);
  if (sellersRes.status === 200 && Array.isArray(sellersRes.body.data)) {
    console.log(`✅ Retrieved ${sellersRes.body.data.length} pending seller dossiers.`);
  } else {
    console.error('❌ Failed to fetch pending sellers:', sellersRes.status);
  }
  console.log('');

  // 7. Test Resources CRUD
  console.log('[RESOURCES] Fetching resources...');
  const resList = await request(`${API_BASE}/admin/resources`, authHeaders);
  if (resList.status === 200 && Array.isArray(resList.body.data)) {
    console.log(`✅ Retrieved ${resList.body.data.length} patient resources.`);
    
    console.log('[RESOURCES] Creating a temporary testing resource...');
    const createRes = await request(`${API_BASE}/admin/resources`, {
      method: 'POST',
      ...authHeaders
    }, {
      title: 'Guide de Test Administrateur',
      category: 'Recettes Cœliaques',
      author: 'Test Admin',
      content: 'Ceci est un document de test généré par le script de vérification des endpoints.',
      status: 'Published'
    });

    const createdResource = createRes.body.data;
    if (createRes.status === 201 && (createdResource?.id || createdResource?._id)) {
      const newResId = createdResource.id || createdResource._id;
      console.log(`✅ Resource created successfully (ID: ${newResId}).`);

      console.log(`[RESOURCES] Deleting temporary resource (ID: ${newResId})...`);
      const deleteRes = await request(`${API_BASE}/admin/resources/${newResId}`, {
        method: 'DELETE',
        ...authHeaders
      });

      if (deleteRes.status === 200) {
        console.log('✅ Resource deleted successfully.');
      } else {
        console.error('❌ Failed to delete resource:', deleteRes.status);
      }
    } else {
      console.error('❌ Failed to create resource:', createRes.status, JSON.stringify(createRes.body));
    }
  } else {
    console.error('❌ Failed to fetch resources list:', resList.status);
  }

  console.log('\n🏁 E2E Verification Complete!');
}

runTests();
