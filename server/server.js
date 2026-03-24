require('dotenv').config();
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? '[set]' : '[not set]');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const PORT = process.env.PORT || 3001;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  // TODO: Implement registration
});

app.post('/api/auth/login', async (req, res) => {
  // TODO: Implement login
});

const jobs = []; // In-memory storage for demo

// Get all jobs
app.get('/api/jobs', async (req, res) => {
  res.json(jobs);
});

// Create job
app.post('/api/jobs', async (req, res) => {
  const { title, company, location, description, url, status } = req.body;
  const newJob = {
    id: Date.now(),
    title,
    company,
    location,
    description,
    url,
    status: status || 'applied',
    notes: ''
  };
  jobs.push(newJob);
  console.log('New job added:', newJob);
  res.json({ message: 'Job saved successfully', job: newJob });
});

// Update job
app.put('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const jobIndex = jobs.findIndex(job => job.id == id);
  if (jobIndex !== -1) {
    jobs[jobIndex] = { ...jobs[jobIndex], ...updates };
    res.json({ message: 'Job updated', job: jobs[jobIndex] });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Delete job
app.delete('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const jobIndex = jobs.findIndex(job => job.id == id);
  if (jobIndex !== -1) {
    jobs.splice(jobIndex, 1);
    res.json({ message: 'Job deleted' });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// AI suggestions (Groq - Llama 3.1 8B)
app.post('/api/ai/suggestions', async (req, res) => {
  const { jobTitle, company, description, resume } = req.body;
  try {
    const resumePrompt = `Rewrite the following resume to best match the job description for the position of ${jobTitle} at ${company}.\n\nJob Description:\n${description || 'Not provided'}\n\nResume:\n${resume || 'Not provided'}\n\nReturn only the tailored resume.`;
    const coverPrompt = `Write a professional cover letter for the position of ${jobTitle} at ${company}, using the following job description and resume as context.\n\nJob Description:\n${description || 'Not provided'}\n\nResume:\n${resume || 'Not provided'}\n\nReturn only the cover letter.`;

    const [resumeCompletion, coverCompletion] = await Promise.all([
      groq.chat.completions.create({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: resumePrompt }] }),
      groq.chat.completions.create({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: coverPrompt }] })
    ]);

    res.json({
      tailoredResume: resumeCompletion.choices[0].message.content,
      coverLetter: coverCompletion.choices[0].message.content
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate tailored content' });
  }
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/build');
  app.use(express.static(buildPath));

  // Only serve index.html for client-side routes (not API calls or asset files).
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) {
      return next();
    }
    return res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});