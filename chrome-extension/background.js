// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveToServer") {
    fetch('http://localhost:3001/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data),
    })
    .then(response => response.json())
    .then(data => console.log('Job saved:', data))
    .catch(error => console.error('Error saving job:', error));
  }
});