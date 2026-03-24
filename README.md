# Job Tracker

**Notice:**
AI features require [Ollama](https://ollama.com/) with the Llama 3.1:8b model running locally.
To use AI resume tailoring and cover letter generation, install Ollama and run:

	ollama pull llama3.1:8b
	ollama run llama3.1:8b

See https://ollama.com/ for setup instructions.

A full-stack application for tracking job applications with a Kanban board, AI-powered suggestions, and analytics.

## Tech Stack
- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: JWT
- AI: OpenAI API
- Extension: Chrome Extension

## Project Structure
- `client/` - React frontend
- `server/` - Node.js backend
- `chrome-extension/` - Chrome extension for auto-saving jobs

## Setup

### Prerequisites
- Node.js
- PostgreSQL
- OpenAI API key

### Backend Setup
1. cd server
2. npm install
3. Set up PostgreSQL database
4. Update .env with your credentials
5. npm run dev

### Frontend Setup
1. cd client
2. npm install
3. npm start

### Chrome Extension
1. Load the chrome-extension folder as unpacked extension in Chrome

## Features
- Track job applications (status, company, role)
- Kanban board view
- Notes per job
- AI resume/cover letter suggestions
- Analytics dashboard
- Chrome extension for auto-saving job postings