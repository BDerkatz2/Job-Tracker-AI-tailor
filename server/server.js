require('dotenv').config();
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '[set]' : '[not set]');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const fetch = require('node-fetch');

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

// AI suggestions
app.post('/api/ai/suggestions', async (req, res) => {
  const { jobTitle, company, description, resume } = req.body;
  try {
    // Tailored Resume
    const resumePrompt = `Rewrite the following resume to best match the job description for the position of ${jobTitle} at ${company}.\n\nJob Description:\n${description || 'Not provided'}\n\nResume:\n${resume || 'Not provided'}\n\nReturn only the tailored resume.`;
    const resumeResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt: resumePrompt,
        stream: false
      })
    });
    if (!resumeResponse.ok) {
      const errorText = await resumeResponse.text();
      console.error('Ollama resume error:', errorText);
      return res.status(500).json({ error: 'Ollama resume error', details: errorText });
    }
    const resumeData = await resumeResponse.json();
    // Cover Letter
    const coverPrompt = `Write a professional cover letter for the position of ${jobTitle} at ${company}, using the following job description and resume as context.\n\nJob Description:\n${description || 'Not provided'}\n\nResume:\n${resume || 'Not provided'}\n\nReturn only the cover letter.`;
    const coverResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt: coverPrompt,
        stream: false
      })
    });
    if (!coverResponse.ok) {
      const errorText = await coverResponse.text();
      console.error('Ollama cover letter error:', errorText);
      return res.status(500).json({ error: 'Ollama cover letter error', details: errorText });
    }
    const coverData = await coverResponse.json();
    res.json({
      tailoredResume: resumeData.response,
      coverLetter: coverData.response
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate tailored content' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});