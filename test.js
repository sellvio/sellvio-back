// Simple test script to verify API health
const http = require('http');

const testHealthCheck = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('Health check response:', data);
        resolve(data);
      });
    });

    req.on('error', (err) => {
      console.error('Health check failed:', err.message);
      reject(err);
    });

    req.end();
  });
};

console.log('Testing API health check...');
setTimeout(() => {
  testHealthCheck()
    .then(() => {
      console.log('✅ API is running successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.log('❌ API test failed:', err.message);
      console.log('Note: Make sure the server is running with "npm run start:dev"');
      process.exit(1);
    });
}, 2000); // Wait 2 seconds for server to start