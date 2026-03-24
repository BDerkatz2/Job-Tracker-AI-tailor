// content.js

// Check if we're on a job detail page
function isJobDetailPage() {
  const url = window.location.href;
  const currentDomain = window.location.hostname;

  console.log('Extension running on URL:', url);
  console.log('Domain:', currentDomain);

  // Indeed job detail patterns - expanded
  if (currentDomain.includes('indeed.com')) {
    const urlIsJobDetail = url.includes('/viewjob') ||
                          (url.includes('/companies/') && url.includes('/jobs/')) ||
                          url.includes('/job/') ||
                          url.match(/\/jobs\/[^?]*\?jk=/); // Indeed job ID pattern

    // Also check for job detail elements on the page (for modal/SPA navigation)
    const hasJobElements = document.querySelector('.jobsearch-JobInfoHeader-title') ||
                          document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ||
                          document.querySelector('#jobDescriptionText') ||
                          document.querySelector('.jobsearch-JobMetadataHeader-item');

    const isJobDetail = urlIsJobDetail || hasJobElements;
    console.log('Indeed job detail check (URL):', urlIsJobDetail);
    console.log('Indeed job detail check (elements):', !!hasJobElements);
    console.log('Indeed job detail check (final):', isJobDetail);
    return isJobDetail;
  }

  // LinkedIn job detail patterns
  if (currentDomain.includes('linkedin.com')) {
    const isJobDetail = url.includes('/jobs/') && !url.includes('/jobs/search/');
    console.log('LinkedIn job detail check:', isJobDetail);
    return isJobDetail;
  }

  // Glassdoor job detail patterns
  if (currentDomain.includes('glassdoor.com')) {
    const isJobDetail = url.includes('/job-listing/') || url.includes('/Job/');
    console.log('Glassdoor job detail check:', isJobDetail);
    return isJobDetail;
  }

  console.log('Not a recognized job site');
  return false;
}

// Extract job details on page load and store in chrome storage
function extractJobDetails() {
  // Only extract if we're on a job detail page
  if (!isJobDetailPage()) {
    console.log('Not on a job detail page, skipping extraction');
    return;
  }
  // Clear previous job data before extraction
  chrome.storage.local.remove('currentJob');
  // More comprehensive job title selectors
  const titleSelectors = [
    'h1',
    '.job-title',
    '.topcard__title',
    '[data-job-title]',
    '.jobsearch-JobInfoHeader-title',
    '.jobTitle',
    '.css-1vg6q84', // Glassdoor
    '[data-testid="job-title"]',
    '.job-header h1',
    '.position-title',
    '.job-detail-title',
    // Indeed specific selectors
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '.jobsearch-JobInfoHeader-title h1',
    '.jobsearch-JobInfoHeader-title span',
    // LinkedIn specific
    '.jobs-unified-top-card__job-title',
    '.jobs-details-top-card__job-title'
  ];

  let jobTitle = 'Unknown Title';
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText?.trim()) {
      jobTitle = element.innerText.trim();
      console.log(`Found title with selector ${selector}:`, jobTitle);
      break;
    }
  }
  // Prevent using 'Indeed' or generic site names as job title
  if (jobTitle.toLowerCase() === 'indeed' || jobTitle.toLowerCase() === 'linkedin' || jobTitle.toLowerCase() === 'glassdoor') {
    console.log('Detected site name as job title, aborting extraction');
    return;
  }

  // More comprehensive company selectors
  const companySelectors = [
    '.company',
    '.topcard__org-name-link',
    '[data-company]',
    '.jobsearch-JobInfoHeader-companyName',
    '.companyName',
    '.employer-name',
    '.css-16nw49e', // Glassdoor
    '[data-testid="company-name"]',
    '.job-company',
    '.company-link',
    '.job-header .company',
    // Indeed specific selectors
    '[data-testid="jobsearch-JobInfoHeader-companyName"]',
    '.jobsearch-JobInfoHeader-companyName a',
    '.jobsearch-JobInfoHeader-companyName span',
    // LinkedIn specific
    '.jobs-unified-top-card__company-name',
    '.jobs-details-top-card__company-url'
  ];

  let company = 'Unknown Company';
  for (const selector of companySelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText?.trim()) {
      company = element.innerText.trim();
      console.log(`Found company with selector ${selector}:`, company);
      break;
    }
  }
  // Prevent saving if company is unchanged or generic
  if (company.toLowerCase() === 'unknown company' || company.toLowerCase() === 'indeed' || company.toLowerCase() === 'linkedin' || company.toLowerCase() === 'glassdoor') {
    console.log('Detected generic or site name as company, aborting extraction');
    return;
  }

  // Filter out generic titles that aren't actual job titles
  if (jobTitle.toLowerCase().includes('jobs in') ||
      jobTitle.toLowerCase().includes('job search') ||
      jobTitle.toLowerCase().includes('find jobs') ||
      jobTitle.length > 100) {
    console.log('Skipping generic search page title:', jobTitle);
    return; // Don't store if it looks like a search page title
  }

  const locationSelectors = [
    '.location',
    '.topcard__flavor--bullet',
    '.job-location',
    '.jobsearch-JobInfoHeader-subtitle',
    '.location-text',
    // Indeed specific
    '[data-testid="jobsearch-JobInfoHeader-subtitle"]',
    '.jobsearch-JobInfoHeader-subtitle div',
    // LinkedIn specific
    '.jobs-unified-top-card__bullet',
    '.jobs-details-top-card__bullet'
  ];

  let location = '';
  for (const selector of locationSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText?.trim()) {
      location = element.innerText.trim();
      break;
    }
  }

  const descriptionSelectors = [
    '.job-description',
    '.description',
    '.jobsearch-JobMetadataHeader-item',
    '.job-detail-description',
    '[data-testid="job-description"]',
    // Indeed specific
    '[data-testid="jobsearch-JobMetadataHeader-item"]',
    '#jobDescriptionText',
    // LinkedIn specific
    '.jobs-description-content__text',
    '.jobs-box__html-content'
  ];

  let description = '';
  for (const selector of descriptionSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText?.trim()) {
      description = element.innerText.trim();
      break;
    }
  }

  // Prevent saving if jobTitle or company is still generic
  if (jobTitle === 'Unknown Title' || company === 'Unknown Company') {
    console.log('Extraction failed: missing job title or company');
    return;
  }
  console.log('Final extracted data:', { jobTitle, company, location, description });

  // Store in chrome storage
  chrome.storage.local.set({
    currentJob: {
      title: jobTitle,
      company: company,
      location: location,
      description: description,
      url: window.location.href
    }
  });
}

// Extract on page load
extractJobDetails();

// Manual save via popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({pong: true});
    return;
  }

  if (request.action === "clearStorage") {
    chrome.storage.local.clear(() => {
      console.log('Cleared all local storage');
    });
    return;
  }

  if (request.action === "saveJob") {
    // Check if we already saved this job recently
    chrome.storage.local.get(['lastSavedUrl'], (result) => {
      if (result.lastSavedUrl === window.location.href) {
        console.log('Already saved this job, skipping duplicate');
        return;
      }

      // Extract job details directly for manual save
      extractJobDetails();

      // Wait a bit for extraction, then get from storage
      setTimeout(() => {
        chrome.storage.local.get(['currentJob'], (result) => {
          if (result.currentJob) {
            const jobData = {
              ...result.currentJob,
              status: 'saved' // Save as 'saved' instead of 'applied' for manual saves
            };
            chrome.runtime.sendMessage({action: "saveToServer", data: jobData});
            // Mark as saved
            chrome.storage.local.set({lastSavedUrl: window.location.href});
          } else {
            // Fallback: extract directly if storage is empty
            console.log('No stored job data, using fallback extraction');
            const fallbackData = extractJobDataDirectly();
            if (fallbackData.title !== 'Unknown Title' || fallbackData.company !== 'Unknown Company') {
              chrome.runtime.sendMessage({action: "saveToServer", data: fallbackData});
              chrome.storage.local.set({lastSavedUrl: window.location.href});
            }
          }
        });
      }, 100);
    });
  }
});

// Direct extraction function for fallback
function extractJobDataDirectly() {
  console.log('Using direct extraction fallback');

  // Debug: Log key job-related elements (simplified)
  const allH1s = document.querySelectorAll('h1');
  console.log('Found H1 elements:', Array.from(allH1s).map(h1 => h1.textContent?.trim().substring(0, 50) + '...'));

  // Try multiple selectors for Indeed specifically
  let jobTitle = 'Unknown Title';
  let company = 'Unknown Company';

  // Indeed specific selectors (try in order of specificity)
  const indeedTitleSelectors = [
    '[data-testid="jobsearch-JobInfoHeader-title"] h1',
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '.jobsearch-JobInfoHeader-title h1',
    '.jobsearch-JobInfoHeader-title',
    'h1[data-testid*="job"]',
    'h1.job-title',
    // Try broader selectors
    'h1:not(:empty)',
    '[data-testid*="JobInfoHeader"] h1',
    '.job-detail-title',
    '.position-title'
  ];

  for (const selector of indeedTitleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent?.trim()) {
      const text = element.textContent.trim();
      // Skip generic titles
      if (!text.toLowerCase().includes('jobs in') && !text.toLowerCase().includes('job search') && text.length < 100) {
        jobTitle = text;
        console.log(`✓ Found title: "${jobTitle}"`);
        break;
      }
    }
  }

  const indeedCompanySelectors = [
    '[data-testid="jobsearch-JobInfoHeader-companyName"] a',
    '[data-testid="jobsearch-JobInfoHeader-companyName"]',
    '.jobsearch-JobInfoHeader-companyName a',
    '.jobsearch-JobInfoHeader-companyName',
    '[data-testid*="company"] a',
    '[data-testid*="company"]',
    // Try broader selectors
    '.company a',
    '.company',
    '.employer a',
    '.employer',
    '[data-testid*="JobInfoHeader"] a'
  ];

  for (const selector of indeedCompanySelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent?.trim()) {
      company = element.textContent.trim();
      console.log(`✓ Found company: "${company}"`);
      break;
    }
  }

  const location = document.querySelector('[data-testid="jobsearch-JobInfoHeader-subtitle"]')?.textContent?.trim() ||
                   document.querySelector('.jobsearch-JobInfoHeader-subtitle')?.textContent?.trim() ||
                   document.querySelector('.location')?.textContent?.trim() ||
                   '';

  const description = document.querySelector('#jobDescriptionText')?.textContent?.trim() ||
                      document.querySelector('[data-testid="job-description"]')?.textContent?.trim() ||
                      document.querySelector('.job-description')?.textContent?.trim() ||
                      '';

  console.log('Final result - Title:', jobTitle, '| Company:', company, '| Description length:', description.length);

  return {
    title: jobTitle,
    company: company,
    location: location,
    description: description,
    url: window.location.href,
    status: 'saved' // Default to 'saved' for manual saves
  };
}

// Detect application submission
function detectApplication() {
  const successSelectors = [
    '.application-submitted',
    '.application-success',
    '[data-testid="application-success"]',
    '.success-message'
  ];

  const successTexts = [
    'application submitted',
    'application sent',
    'applied successfully',
    'your application has been submitted'
  ];

  // Check for elements
  for (let selector of successSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }

  // Check for text content
  const bodyText = document.body.innerText.toLowerCase();
  for (let text of successTexts) {
    if (bodyText.includes(text)) {
      return true;
    }
  }

  return false;
}

// Monitor for application detection
setInterval(() => {
  if (detectApplication()) {
    // Check if we already auto-saved this job
    chrome.storage.local.get(['lastAutoSavedUrl'], (result) => {
      if (result.lastAutoSavedUrl === window.location.href) {
        console.log('Already auto-saved this job, skipping');
        return;
      }

      // Retrieve stored job details
      chrome.storage.local.get(['currentJob'], (jobResult) => {
        if (jobResult.currentJob) {
          const jobData = {
            ...jobResult.currentJob,
            status: 'applied'
          };
          console.log('Auto-saving job:', jobData.title, 'at', jobData.company);
          // Send to background script
          chrome.runtime.sendMessage({action: "saveToServer", data: jobData});
          // Mark as auto-saved and clear stored data
          chrome.storage.local.set({lastAutoSavedUrl: window.location.href});
          chrome.storage.local.remove(['currentJob']);
        }
      });
    });
  }
}, 5000);