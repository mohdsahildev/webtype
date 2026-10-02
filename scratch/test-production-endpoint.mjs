import http from 'http';

const URLS = [
  'http://localhost:3005/',
  'http://localhost:3005/assets/character/Webtype%20Character.fbx',
  'http://localhost:3005/assets/character/Falling%20Idle.fbx',
  'http://localhost:3005/assets/character/Start%20Swinging.fbx',
  'http://localhost:3005/assets/character/Swinging.fbx',
  'http://localhost:3005/assets/character/Big%20Jump.fbx',
  'http://localhost:3005/assets/character/Flying.fbx',
  'http://localhost:3005/assets/character/Falling%20To%20Landing.fbx',
  'http://localhost:3005/assets/character/Idle.fbx',
  'http://localhost:3005/assets/character/Sprint.fbx',
  'http://localhost:3005/assets/city/commercial/colormap.png',
  'http://localhost:3005/assets/city/commercial/building-a.glb',
  'http://localhost:3005/assets/city/commercial/building-skyscraper-a.glb',
  'http://localhost:3005/assets/city/commercial/low-detail-building-d.glb',
  'http://localhost:3005/data/word-bank.json',
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let dataLen = 0;
      res.on('data', (chunk) => { dataLen += chunk.length; });
      res.on('end', () => {
        resolve({ url, statusCode: res.statusCode, size: dataLen });
      });
    }).on('error', (err) => {
      resolve({ url, statusCode: 500, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing Production Server Endpoints & Static Assets...');
  let failed = 0;
  for (const u of URLS) {
    const res = await checkUrl(u);
    if (res.statusCode === 200) {
      console.log(`✓ [200 OK] ${res.url} (${res.size} bytes)`);
    } else {
      console.error(`✗ [${res.statusCode}] ${res.url}`);
      failed++;
    }
  }
  if (failed === 0) {
    console.log('\nAll production static assets and main route returned 200 OK!');
  } else {
    console.error(`\n${failed} asset requests failed!`);
    process.exit(1);
  }
}

run();
