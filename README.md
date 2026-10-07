# Secret Diary

A privacy-focused digital diary with multi-factor authentication, decoy access, panic locking, and persistent encrypted entries.

**Live:** https://multi-state-decoy-diary.vercel.app/

## Features

* Multi-factor authentication with numeric, secret, and pattern factors
* Silent decoy diary when incorrect factors are entered
* Panic lock with `Ctrl + Shift + L`
* Create, edit, and delete diary entries
* Persistent PostgreSQL storage
* Automatic database schema initialization
* Resilient authentication state handling
* Production deployment on Vercel

## Tech Stack

* Next.js
* React
* TypeScript
* PostgreSQL
* Drizzle
* Vercel

## Architecture

```text
Browser
   │
   ▼
Next.js / React
   │
   ├── Authentication
   ├── Diary UI
   └── API Routes
           │
           ▼
       PostgreSQL
        ├── vault
        └── diary_entries
```

## Running Locally

```bash
git clone <repository-url>
cd secret-diary
npm install
npm run dev
```

Configure the required environment variables in `.env.local`:

```env
DATABASE_URL=your_postgresql_connection_string
```

For database schema management:

```bash
npm run db:push
```

## Production

The application is deployed through Vercel with PostgreSQL persistence.

The production health endpoint verifies both database connectivity and schema availability:

```text
/api/health
```

Example:

```json
{
  "ok": true,
  "db": true,
  "schema": {
    "vault": true,
    "diary_entries": true
  }
}
```

## Development

The project was tested across:

* Authentication and decoy access
* Entry creation, editing, and deletion
* Lock/unlock flows
* Refresh persistence
* Panic locking
* Database initialization
* Database failure handling
* Production deployment

## Status

**Production-ready personal project.**
