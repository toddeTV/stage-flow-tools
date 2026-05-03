# Quick Start Guide

Get the quiz application running in minutes.

## Prerequisites

- Node.js 24.x
- Vite+ (`vp`)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd stage-flow-tools
   ```

2. **Install dependencies**

   ```bash
   vp install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   vp run dev
   ```

## Access Points

- **Quiz Interface**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Live Results**: http://localhost:3000/admin/results
- **Leaderboard**: http://localhost:3000/admin/leaderboard

## Default Credentials

- **Username**: admin
- **Password**: 123

## Next Steps

- [Local Development Setup](setup-local.md) - Detailed development configuration
- [Production Deployment](setup-production.md) - Deploy to production
- [Architecture Overview](architecture.md) - Understand the system
