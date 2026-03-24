// Test Ollama API connectivity from Node.js
const fetch = require('node-fetch');

async function testOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt: 'Say hello world',
        stream: false
      })
    });
    const data = await response.json();
    console.log('Ollama API response:', data);
  } catch (err) {
    console.error('Error connecting to Ollama:', err);
  }
}

testOllama();
