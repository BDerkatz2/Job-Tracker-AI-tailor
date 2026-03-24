// background.js
// TODO: Update SERVER_URL to your Render deployment URL after deploying
const SERVER_URL = 'https://your-app-name.onrender.com';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveToServer") {
    fetch(`${SERVER_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data),
    })
    .then(response => response.json())
    .then(data => console.log('Job saved:', data))
    .catch(error => console.error('Error saving job:', error));
  }
});