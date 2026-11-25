# ECommerce API

Node.js / Express API backed by PostgreSQL for shopper and shelf data.

## What it holds
- `server.js` - Express server with endpoints that validate a shopper ID and record shelf activity inside a database transaction

## Stack
Node.js, Express, PostgreSQL (`pg`), dotenv

## Run it
```bash
npm install
# create a .env with DB_USER, DB_HOST, DB_NAME, DB_PASSWORD
node server.js
```

## Status
Small learning / prototype project.
