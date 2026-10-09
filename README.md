# REUNITE AI 🌍
### Offline-First AI-Powered Disaster Family Reunification System

**HackNext 2026 | Disaster Management**

## 📌 Problem Statement

During natural disasters, families often become separated and displaced across different relief camps. Communication networks may be unavailable, making it difficult to locate missing family members.

REUNITE AI addresses this challenge through offline-first registration, intelligent record matching, and a human-verified family reunification workflow.

## 🚀 Key Features

- **Offline Registration:** Camp volunteers can register missing and found persons without an active internet connection.
- **Multi-Camp Synchronization:** Records synchronize between camps when connectivity is restored.
- **AI-Assisted Matching:** Identifies potential matches using available person and family information.
- **Authority Dashboard:** Allows authorized officers to review potential matches.
- **Camp Confirmation:** Camp volunteers verify whether registered individuals are present.
- **Family Verification:** Authorized officers verify identities and relationships before confirming a match.
- **Notifications:** Provides updates about potential matches and verification progress.
- **Local AI Support:** Designed to support AI processing without relying entirely on cloud services.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| Server Database | SQLite |
| Offline Storage | IndexedDB, Dexie.js |
| AI Integration | Ollama |
| Offline Support | Progressive Web App |
| Communication | REST API, Local Network |

## ⚙️ Installation

### Prerequisites

- Node.js and npm
- Python
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/25cseb59vikas/Disaster-Affected-Family-Reunification.git
cd Disaster-Affected-Family-Reunification
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Start the Frontend

```bash
npm run dev:http
```

### 4. Start the Backend

Create and activate a Python virtual environment, install the backend dependencies according to the repository configuration, and run:

```bash
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
```

## 🔄 How It Works

1. Camp A registers a missing person.
2. Camp B registers a found person.
3. Available records synchronize with the central server.
4. The matching engine identifies potential family connections.
5. The authority reviews and approves a potential match.
6. Required camps confirm the individuals' presence.
7. An authorized officer verifies the family relationship.
8. The system records the verified match for coordinated reunification.

**Important:** AI-generated matches are suggestions only. Human verification is required before any reunification decision.

## 🌐 Offline-First Architecture

REUNITE AI uses local browser storage to support registration during network interruptions.

Once a connection to the backend becomes available, pending records can be synchronized across participating camps.

## 🎯 Project Objective

To help disaster relief teams locate separated families faster through accessible, offline-capable technology while maintaining human oversight of identity verification.

## 🔐 Privacy and Safety

- Potential matches require human verification.
- Sensitive personal information should only be accessible to authorized personnel.
- Demo records should use fictional information.
- A verified match does not automatically mean a physical reunion has occurred.

## 📄 Project Status

**Hackathon Prototype — Functional Demo**

Developed for HackNext 2026.