# Quick Start Guide

Get the quiz application running in minutes.

## Prerequisites

- Node.js 26.x
- Vite+ (`vp`)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd stage-flow-tools
   ```

2. **Install dependencies**

   ```bash
   vp run install:clean
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Set `NUXT_ADMIN_PASSWORD` and `NUXT_JWT_SECRET` to separate private values in
   your `.env` file. Generate them with `openssl rand -hex 32` and
   `openssl rand -hex 48`, respectively. Both are required even for development;
   empty values and the previous published defaults prevent server startup.

4. **Start development server**
   ```bash
   vp run dev
   ```

## Access Points

- **Quiz Interface**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Live Results**: http://localhost:3000/admin/results
- **Leaderboard**: http://localhost:3000/admin/leaderboard
- **Database Admin**: http://localhost:3000/admin/database

## Login Credentials

- **Username**: admin
- **Password**: Your configured `NUXT_ADMIN_PASSWORD` value

## Next Steps

- [Local Development Setup](setup-local.md) - Detailed development configuration
- [Production Deployment](setup-production.md) - Deploy to production
- [Architecture Overview](architecture.md) - Understand the system
