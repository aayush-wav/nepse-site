# NEPSE Elite

A comprehensive analysis platform for the Nepal Stock Exchange (NEPSE), built with React and FastAPI.

## Features

- **Live Market Dashboard**: Real-time tracking of NEPSE Index, turnovers, and market breadth.
- **Advanced Charting**: Interactive candlestick charts with technical indicators.
- **Broker Intelligence**: Detailed breakdown of broker-wise transaction activity and performance.
- **Fundamental Analysis**: Key financial metrics and ratios for listed companies.
- **Portfolio & Watchlist**: Tools to track personal investments and monitor favorite stocks.
- **Market News & Alerts**: Stay updated with the latest market announcements and custom price alerts.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python), Uvicorn
- **Data Fetching**: React Query (TanStack Query)
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python 3.10+
- pip & virtualenv

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nepse
   ```

2. **Frontend Setup**
   ```bash
   npm install
   ```

3. **Backend Setup**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

### Running the Application

You can run both the frontend and backend concurrently from the root directory:

```bash
npm run dev:full
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## Project Structure

- `/src`: React frontend application
  - `/components`: UI components (layout, shared, charts)
  - `/hooks`: Custom hooks for data fetching and logic
  - `/store`: Zustand state management
  - `/utils`: Helper functions and formatting
- `/backend`: FastAPI backend
  - `/routes`: API endpoints grouped by module
  - `main.py`: Application entry point
- `/public`: Static assets

## License

MIT
