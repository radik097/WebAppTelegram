import fetch from 'node-fetch';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

console.log("Testing connection to api.telegram.org (IPv4 first)...");

fetch('https://google.com')
    .then(res => console.log(`Google Status: ${res.status}`))
    .catch(err => console.error("Google failed:", err));
