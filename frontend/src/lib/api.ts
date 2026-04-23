import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api', // Uses env variable in production, falls back to localhost
    withCredentials: true
});

export default api;
