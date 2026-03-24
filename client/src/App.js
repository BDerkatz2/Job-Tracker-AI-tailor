
import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState('kanban');
  const [userResume, setUserResume] = useState('');
  const [userResumeType, setUserResumeType] = useState(''); // new: file type
  const [userResumeUrl, setUserResumeUrl] = useState(''); // new: file URL (for PDF/image)
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showResumeView, setShowResumeView] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  // AI Modal State
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [tailoredResume, setTailoredResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/jobs`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const statuses = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

  const updateJob = async (jobId, updates) => {
    try {
      await fetch(`${API_BASE}/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setJobs(jobs.map(job => job.id === jobId ? { ...job, ...updates } : job));
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  const deleteJob = async (jobId) => {
    try {
      await fetch(`${API_BASE}/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };



  const totalApplications = jobs.filter(job => job.status !== 'saved').length;
  const interviews = jobs.filter(job => job.status === 'interviewing' || job.status === 'offer').length;
  const offers = jobs.filter(job => job.status === 'offer').length;
  const interviewRate = totalApplications > 0 ? ((interviews / totalApplications) * 100).toFixed(1) : 0;
  const offerRate = totalApplications > 0 ? ((offers / totalApplications) * 100).toFixed(1) : 0;

  const handleResumeUpload = (event) => {
    const file = event.target.files[0] || event.dataTransfer?.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    // Expanded file type support
    const textTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/rtf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ];

    const imageTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'
    ];

    const fileExtension = file.name.toLowerCase().split('.').pop();
    const textExtensions = ['txt', 'md', 'rtf', 'doc', 'docx', 'pdf', 'html', 'htm', 'json'];
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

    const isText = textTypes.includes(file.type) || textExtensions.includes(fileExtension);
    const isImage = imageTypes.includes(file.type) || imageExtensions.includes(fileExtension);
    const isPdf = file.type === 'application/pdf' || fileExtension === 'pdf';

    if (!(isText || isImage || isPdf)) {
      alert('Please upload a supported file type: TXT, DOC, DOCX, PDF, MD, RTF, HTML, JSON, PNG, JPG, JPEG, GIF, WEBP, SVG');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }


    if (isImage) {
      const url = URL.createObjectURL(file);
      setUserResumeUrl(url);
      setUserResumeType('image');
      setUserResume('');
      localStorage.setItem('userResumeType', 'image');
      localStorage.setItem('userResumeUrl', url);
      localStorage.removeItem('userResume');
      alert(`Resume "${file.name}" uploaded successfully!`);
      return;
    }

    if (isPdf) {
      const url = URL.createObjectURL(file);
      setUserResumeUrl(url);
      setUserResumeType('pdf');
      localStorage.setItem('userResumeType', 'pdf');
      localStorage.setItem('userResumeUrl', url);
      // Extract text from PDF for AI
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf');
          const pdfjsLib = pdfjsModule.default || pdfjsModule;
          if (pdfjsLib?.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = process.env.PUBLIC_URL
              ? process.env.PUBLIC_URL + '/pdf.worker.min.js'
              : '/pdf.worker.min.js';
          }
          console.log('PDF extraction: File loaded, starting extraction...');
          const typedarray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          console.log('PDF extraction: PDF loaded, numPages =', pdf.numPages);
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            console.log(`PDF extraction: Page ${i} text:`, pageText);
            text += pageText + '\n';
          }
          setUserResume(text);
          localStorage.setItem('userResume', text);
          console.log('PDF extraction: Extraction complete, text length:', text.length);
        } catch (err) {
          setUserResume('');
          localStorage.removeItem('userResume');
          console.error('PDF extraction error:', err);
          alert('Failed to extract text from PDF. See console for details.');
        }
      };
      reader.onerror = () => {
        alert('Error reading PDF file.');
      };
      reader.readAsArrayBuffer(file);
      alert(`Resume "${file.name}" uploaded successfully!`);
      return;
    }

    // Text-based file
    const reader = new FileReader();
    reader.onload = (e) => {
      setUserResume(e.target.result);
      setUserResumeType('text');
      setUserResumeUrl('');
      localStorage.setItem('userResume', e.target.result);
      localStorage.setItem('userResumeType', 'text');
      localStorage.removeItem('userResumeUrl');
      alert(`Resume "${file.name}" uploaded successfully!`);
    };
    reader.onerror = () => {
      alert('Error reading file. Please try again or paste the content directly.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleResumeTextChange = (event) => {
    const text = event.target.value;
    setUserResume(text);
    setUserResumeType('text');
    setUserResumeUrl('');
    localStorage.setItem('userResume', text);
    localStorage.setItem('userResumeType', 'text');
    localStorage.removeItem('userResumeUrl');
  };

  // Load resume from localStorage on component mount
  useEffect(() => {
    const savedResume = localStorage.getItem('userResume');
    const savedType = localStorage.getItem('userResumeType');
    const savedUrl = localStorage.getItem('userResumeUrl');
    if (savedType === 'image' || savedType === 'pdf') {
      setUserResumeUrl(savedUrl);
      setUserResumeType(savedType);
      setUserResume('');
    } else if (savedResume) {
      setUserResume(savedResume);
      setUserResumeType('text');
      setUserResumeUrl('');
    }
  }, []);

  return (
    <div className="App">
      {/* AI Tailoring Modal (moved into return) */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div className="modal-content" style={{ maxWidth: 900, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>AI Resume Tailoring & Cover Letter</h3>
              <button className="modal-close" onClick={() => setShowAIModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="job-select">Select Job:&nbsp;</label>
                <select
                  id="job-select"
                  value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                  style={{ minWidth: 200 }}
                >
                  <option value="">-- Choose a job --</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.title} @ {job.company}</option>
                  ))}
                </select>
                <button
                  style={{ marginLeft: 16 }}
                  disabled={!selectedJobId || aiLoading}
                  onClick={async () => {
                    setAiError('');
                    setTailoredResume('');
                    setCoverLetter('');
                    setAiLoading(true);
                    try {
                      const job = jobs.find(j => j.id == selectedJobId);
                      const response = await fetch(`${API_BASE}/api/ai/suggestions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          jobTitle: job.title,
                          company: job.company,
                          description: job.description,
                          resume: userResume
                        })
                      });
                      const data = await response.json();
                      if (data.tailoredResume && data.coverLetter) {
                        setTailoredResume(data.tailoredResume);
                        setCoverLetter(data.coverLetter);
                      } else {
                        setAiError(data.error || 'Failed to generate content.');
                      }
                    } catch (err) {
                      setAiError('Error contacting AI service.');
                    }
                    setAiLoading(false);
                  }}
                >
                  Generate
                </button>
              </div>
              {aiLoading && <div>Generating tailored resume and cover letter...</div>}
              {aiError && <div style={{ color: 'red', marginBottom: 12 }}>{aiError}</div>}
              {tailoredResume && (
                <div style={{ marginBottom: 32 }}>
                  <h4>Tailored Resume</h4>
                  <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', borderRadius: 8, padding: 16, fontSize: 15, maxHeight: 350, overflowY: 'auto', color: '#111' }}>{tailoredResume}</pre>
                </div>
              )}
              {coverLetter && (
                <div>
                  <h4>Cover Letter</h4>
                  <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', borderRadius: 8, padding: 16, fontSize: 15, maxHeight: 350, overflowY: 'auto', color: '#111' }}>{coverLetter}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <header className="App-header">
        <h1>Job Tracker</h1>
        <div>
          <button onClick={() => setView('kanban')}>Kanban</button>
          <button onClick={() => setView('analytics')}>Analytics</button>
          <button onClick={() => setShowResumeUpload(true)}>Resume</button>
          <button onClick={() => setShowAIModal(true)}>AI Tailor</button>
        </div>
      </header>

      {/* Resume Upload Modal */}
      {showResumeUpload && (
        <div className="modal-overlay" onClick={() => setShowResumeUpload(false)}>
          <div className="modal-content resume-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Your Resume</h3>
              <button className="modal-close" onClick={() => setShowResumeUpload(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="resume-upload-section">
                <div className="upload-options">
                  <div className="upload-option">
                    <h4>Resume File Upload</h4>
                    <p style={{color: '#111', fontSize: '1em', marginBottom: '18px'}}>Select your resume file or drag it into the box below.</p>
                    <div
                      className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('resume-file-input').click()}
                      style={{color: '#111'}}>
                      <div className="drop-zone-content">
                        <div className="drop-text" style={{color: '#111', fontWeight: 600, fontSize: '1.1em'}}>Click or drag a file here to upload</div>
                        <div className="file-types" style={{color: '#555', fontSize: '0.95em'}}>Supported: TXT, DOC, DOCX, PDF, MD, RTF, HTML</div>
                      </div>
                    </div>
                    <input
                      id="resume-file-input"
                      type="file"
                      accept=".txt,.md,.doc,.docx,.pdf,.rtf,.html,.htm,.json"
                      onChange={handleResumeUpload}
                      className="file-input-hidden"
                    />
                  </div>
                  <div className="upload-option">
                    <h4>Paste Resume Text</h4>
                    <p style={{color: '#111', fontSize: '1em', marginBottom: '18px'}}>Paste Resume below</p>
                    <textarea
                      value={userResume}
                      onChange={handleResumeTextChange}
                      placeholder="Paste your resume here."
                      rows={12}
                      className="resume-textarea"
                      style={{color: '#111'}}
                    />
                  </div>
                </div>
                {(userResume || userResumeUrl) && (
                  <div style={{ marginTop: 16 }}>
                    <button
                      onClick={() => setShowResumeView(true)}
                      className="view-resume-btn"
                    >
                      View Resume
                    </button>
                    <button
                      onClick={() => {
                        setUserResume('');
                        setUserResumeType('');
                        setUserResumeUrl('');
                        localStorage.removeItem('userResume');
                        localStorage.removeItem('userResumeType');
                        localStorage.removeItem('userResumeUrl');
                      }}
                      className="remove-resume-btn"
                      style={{ marginLeft: 8 }}
                    >
                      Remove Resume
                    </button>
                    <button
                      onClick={() => setShowResumeUpload(false)}
                      className="save-resume-btn"
                      style={{ marginLeft: 8 }}
                    >
                      Save & Close
                    </button>
                  </div>
                )}

                {/* Full Resume Modal */}
                {showResumeView && (
                  <div className="modal-overlay" onClick={() => setShowResumeView(false)}>
                    <div className="modal-content" style={{ maxWidth: 800, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>Full Resume</h3>
                        <button className="modal-close" onClick={() => setShowResumeView(false)}>×</button>
                      </div>
                      <div className="modal-body" style={{ padding: 24 }}>
                        {userResumeType === 'pdf' && userResumeUrl && (
                          <iframe
                            src={userResumeUrl}
                            title="Resume PDF"
                            style={{ width: '100%', height: '70vh', border: 'none' }}
                          />
                        )}
                        {userResumeType === 'image' && userResumeUrl && (
                          <img
                            src={userResumeUrl}
                            alt="Resume Preview"
                            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, background: '#fff' }}
                          />
                        )}
                        {userResumeType === 'text' && (
                          <pre style={{ whiteSpace: 'pre-wrap', color: '#111', background: '#fff', borderRadius: 8, padding: 16, fontSize: 15, maxHeight: 600, overflowY: 'auto' }}>{userResume}</pre>
                        )}
                        {!userResumeType && (
                          <div>No resume to display.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'kanban' && (
        <div className="kanban-board">
          {statuses.map(status => (
            // eslint-disable-next-line no-undef
            <KanbanColumn
              key={status}
              status={status}
              jobs={jobs.filter(job => job.status === status)}
              updateJob={updateJob}
              deleteJob={deleteJob}
              userResume={userResume}
            />
          ))}
        </div>
      )}
      {view === 'analytics' && (
        <AnalyticsDashboard
          totalApplications={totalApplications}
          interviews={interviews}
          offers={offers}
          interviewRate={interviewRate}
          offerRate={offerRate}
        />
      )}
    </div>
  );
}

function KanbanColumn({ status, jobs, updateJob, deleteJob, userResume }) {
  return (
    <div className={`kanban-column ${status}`}>
      <h2>{status.charAt(0).toUpperCase() + status.slice(1)}</h2>
      {jobs.map(job => (
        <JobCard key={job.id} job={job} updateJob={updateJob} deleteJob={deleteJob} userResume={userResume} />
      ))}
    </div>
  );
}

function JobCard({ job, updateJob, deleteJob, userResume }) {
  const [showNotes, setShowNotes] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState('');

  const openDescriptionPopup = () => {
    try {
      const popup = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
      if (!popup) {
        alert('Popup blocked! Please allow popups for this site.');
        return;
      }

      const popupContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${job.title} - Job Description</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #ffffff 0%, #f4f4f4 100%);
                color: #000000;
                min-height: 100vh;
                line-height: 1.6;
              }
              .container {
                max-width: 800px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
              }
              h1 {
                margin-top: 0;
                font-size: 2em;
                text-align: center;
                color: #ffffff;
              }
              .company {
                text-align: center;
                font-size: 1.2em;
                margin-bottom: 10px;
                opacity: 0.9;
                color: #000000;
              }
              .location {
                text-align: center;
                margin-bottom: 30px;
                opacity: 0.8;
                color: #000000;
              }
              .description {
                line-height: 1.6;
                white-space: pre-wrap;
                background: rgba(255, 255, 255, 0.9);
                padding: 20px;
                border-radius: 10px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                color: #000000;
                font-size: 16px;
              }
              .close-btn {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: #ffffff;
                font-size: 24px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s;
                z-index: 1000;
              }
              .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
              }
            </style>
          </head>
          <body>
            <button class="close-btn" onclick="window.close()">×</button>
            <div class="container">
              <h1>${job.title}</h1>
              <div class="company">${job.company}</div>
              ${job.location ? `<div class="location">📍 ${job.location}</div>` : ''}
              <div class="description">${job.description ? job.description.replace(/\n/g, '<br>') : 'No description available'}</div>
            </div>
          </body>
        </html>
      `;

      popup.document.write(popupContent);
      popup.document.close();
    } catch (error) {
      console.error('Error opening popup:', error);
      alert('Error opening popup window. Please check your browser settings.');
    }
  };

  const generateSuggestions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobTitle: job.title, 
          company: job.company, 
          description: job.description,
          resume: userResume
        }),
      });
      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  };

  return (
    <>
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>{job.company}</p>
      {job.description && <p className="job-description">{job.description.substring(0, 100)}...</p>}
      <select value={job.status} onChange={(e) => updateJob(job.id, { status: e.target.value })}>
        <option value="saved">Saved</option>
        <option value="applied">Applied</option>
        <option value="interviewing">Interviewing</option>
        <option value="offer">Offer</option>
        <option value="rejected">Rejected</option>
      </select>
      <button onClick={() => setShowNotes(!showNotes)}>Notes</button>
      <button onClick={() => { setShowSuggestions(!showSuggestions); if (!showSuggestions) generateSuggestions(); }}>AI Suggestions</button>
      {job.description && job.description.length > 100 && (
        <button onClick={openDescriptionPopup}>
          Show Full Description
        </button>
      )}
      <button onClick={() => deleteJob(job.id)} className="delete-btn">Delete</button>
      {showNotes && (
        <textarea
          value={job.notes}
          onChange={(e) => updateJob(job.id, { notes: e.target.value })}
          placeholder="Add notes..."
        />
      )}
      {showSuggestions && (
        <div className="suggestions">
          <p>{suggestions || 'Generating...'}</p>
        </div>
      )}
    </div>
    </>
  );
}

function AnalyticsDashboard({ totalApplications, interviews, offers, interviewRate, offerRate }) {
  return (
    <div className="analytics-dashboard">
      <h2>Analytics Dashboard</h2>
      <div className="stats">
        <div className="stat">
          <h3>Total Applications</h3>
          <p>{totalApplications}</p>
        </div>
        <div className="stat">
          <h3>Interviews</h3>
          <p>{interviews}</p>
        </div>
        <div className="stat">
          <h3>Offers</h3>
          <p>{offers}</p>
        </div>
        <div className="stat">
          <h3>Interview Rate</h3>
          <p>{interviewRate}%</p>
        </div>
        <div className="stat">
          <h3>Offer Rate</h3>
          <p>{offerRate}%</p>
        </div>
      </div>
    </div>
  );
}

export default App;
