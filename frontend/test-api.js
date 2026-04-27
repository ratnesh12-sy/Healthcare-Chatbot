const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:8081/api', withCredentials: true });

async function run() {
  try {
    const loginRes = await api.post('/auth/signin', { username: 'raatnesh', password: 'Patient@123' });
    const token = loginRes.data.token;
    console.log('Login success');
    
    const docRes = await api.get('/doctors/all', {
      headers: { Cookie: `token=${token}` }
    });
    console.log('Doctors:', JSON.stringify(docRes.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
run();
