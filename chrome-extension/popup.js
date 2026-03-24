// popup.js
document.getElementById('saveBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];

    // Check if content script is available by sending a test message
    chrome.tabs.sendMessage(tab.id, {action: "ping"}, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not available, inject it temporarily
        console.log('Content script not available, injecting...');
        chrome.scripting.executeScript({
          target: {tabId: tab.id},
          files: ['content.js']
        }, () => {
          // Now try to save
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {action: "saveJob"});
          }, 100);
        });
      } else {
        // Content script is available
        chrome.tabs.sendMessage(tab.id, {action: "saveJob"});
      }
    });
  });
});

// Clear storage button for debugging
document.getElementById('clearBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    chrome.tabs.sendMessage(tab.id, {action: "clearStorage"}, (response) => {
      if (chrome.runtime.lastError) {
        // If content script not available, clear from background
        chrome.storage.local.clear(() => {
          console.log('Cleared storage from background');
        });
      }
    });
  });
});