const http = require('http');

function checkEndpoint(path) {
  return new Promise((resolve, reject) => {
    http
      .get(
        {
          hostname: 'localhost',
          port: 3000,
          path: path,
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            console.log(`\n--- ${path} ---`);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Body Sample: ${data.substring(0, 200)}...`);
            try {
              JSON.parse(data);
              console.log('Valid JSON');
              resolve(true);
            } catch (e) {
              console.log('Invalid JSON');
              resolve(false);
            }
          });
        }
      )
      .on('error', (err) => {
        console.error(`Error: ${err.message}`);
        resolve(false);
      });
  });
}

async function run() {
  await checkEndpoint('/api/user/settings');
  await checkEndpoint('/api/user/prompts?limit=10');
}

run();
