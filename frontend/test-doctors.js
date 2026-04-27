const http = require('http');

function request(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 8081, path, method,
      headers: { ...headers }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(opts, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: chunks }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: Login as patient 'raatnesh' (demo seed username has double 'a')
  console.log('=== STEP 1: Login as raatnesh ===');
  const login = await request('POST', '/api/auth/signin', {}, JSON.stringify({
    username: 'raatnesh', password: 'Patient@123'
  }));
  console.log('Login status:', login.status);

  // Extract the 'token' cookie (that's what AuthTokenFilter reads)
  let tokenCookie = '';
  const cookies = login.headers['set-cookie'];
  if (cookies) {
    cookies.forEach(c => {
      if (c.startsWith('token=')) {
        tokenCookie = c.split(';')[0]; // "token=xxx"
      }
    });
  }
  console.log('Cookie:', tokenCookie ? tokenCookie.substring(0, 50) + '...' : 'NONE');

  if (!tokenCookie) {
    console.log('Login response body:', login.body.substring(0, 300));
    return;
  }

  // Step 2: Fetch doctors using the cookie
  console.log('\n=== STEP 2: Fetch /api/doctors/all ===');
  const docs = await request('GET', '/api/doctors/all', { 'Cookie': tokenCookie });
  console.log('Doctors status:', docs.status);

  try {
    const arr = JSON.parse(docs.body);
    if (Array.isArray(arr)) {
      console.log('✅ Doctor count:', arr.length);
      arr.forEach(d => console.log('  -', d.user?.fullName || 'unknown', '-', d.specialization));
    } else {
      console.log('Response:', docs.body.substring(0, 500));
    }
  } catch(e) {
    console.log('Raw:', docs.body.substring(0, 500));
  }
}

main().catch(e => console.error('ERROR:', e.message));
