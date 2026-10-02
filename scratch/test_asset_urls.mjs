import http from 'http';
import { KENNEY_COMMERCIAL_ASSETS } from '../lib/game/city-assets.ts';

function testUrl(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let size = 0;
      res.on('data', chunk => { size += chunk.length; });
      res.on('end', () => {
        resolve({ path, statusCode: res.statusCode, size });
      });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function run() {
  console.log('=== VERIFYING ALL PRODUCTION STATIC ASSET URLS (http://localhost:3000) ===\n');
  
  let passCount = 0;
  let failCount = 0;

  const assetsToTest = [
    // Data
    '/data/word-bank.json',
    // Textures
    '/assets/city/commercial/colormap.png',
    '/assets/city/commercial/Textures/colormap.png',
    // Character FBXs
    '/assets/character/Webtype%20Character.fbx',
    '/assets/character/Idle.fbx',
    '/assets/character/Sprint.fbx',
    '/assets/character/Falling%20Idle.fbx',
    '/assets/character/Flying.fbx',
    '/assets/character/Start%20Swinging.fbx',
    '/assets/character/Swinging.fbx',
    '/assets/character/Big%20Jump.fbx',
    '/assets/character/Falling%20To%20Landing.fbx',
    // City GLBs
    ...KENNEY_COMMERCIAL_ASSETS.map(a => a.path)
  ];

  for (const assetPath of assetsToTest) {
    const res = await testUrl(assetPath);
    if (res.statusCode === 200 && res.size > 0) {
      passCount++;
      console.log(`[PASS] 200 OK (${(res.size / 1024).toFixed(1)} KB) - ${assetPath}`);
    } else {
      failCount++;
      console.error(`[FAIL] Status ${res.statusCode}, Size ${res.size} - ${assetPath}`);
    }
  }

  console.log(`\nAsset Verification Summary: ${passCount} PASSED, ${failCount} FAILED out of ${assetsToTest.length} assets.`);
  if (failCount === 0) {
    console.log('✓ ALL PRODUCTION STATIC ASSETS RETURN HTTP 200 OK!');
  } else {
    process.exit(1);
  }
}

run();

