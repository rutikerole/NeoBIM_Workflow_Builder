import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const accessKey = process.env.KLING_ACCESS_KEY;
const secretKey = process.env.KLING_SECRET_KEY;

if (!accessKey || !secretKey) {
  console.log('ERROR: No Kling keys found in .env.local');
  process.exit(1);
}

console.log('Access key:', accessKey.slice(0, 8) + '...');
console.log('Secret key:', secretKey.slice(0, 8) + '...');

// Generate JWT (same as video-service.ts)
const now = Math.floor(Date.now() / 1000);
const header = { alg: 'HS256', typ: 'JWT' };
const payload = { iss: accessKey, exp: now + 1800, nbf: now - 5, iat: now };

function b64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const h = b64url(JSON.stringify(header));
const p = b64url(JSON.stringify(payload));
const sig = crypto.createHmac('sha256', secretKey).update(h + '.' + p).digest('base64url');
const token = h + '.' + p + '.' + sig;

console.log('\nTesting Kling API...');

// Test: create a simple task with a public test image
const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg';

const models = ['kling-v2-6', 'kling-v2-1-master', 'kling-v2-1', 'kling-v1-6'];

for (const model of models) {
  try {
    console.log(`\nTrying model: ${model}...`);
    const res = await fetch('https://api.klingai.com/v1/videos/image2video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model_name: model,
        image: testImageUrl,
        prompt: 'Camera slowly orbits around the subject',
        duration: '5',
        mode: 'std',
        aspect_ratio: '16:9',
      }),
    });

    console.log(`  Status: ${res.status}`);
    const data = await res.json();
    console.log(`  Response:`, JSON.stringify(data).slice(0, 400));

    if (data.code === 0) {
      console.log(`  SUCCESS! Task ID: ${data.data.task_id}`);
      break;
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
}
