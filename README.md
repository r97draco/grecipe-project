# Grecipe CS 476 Project

## Overview

A full-stack web Application to generate Recipes from receipts and save the data for all various members of family to use.

## Getting Started

### Prerequisites

- Node.js 24 (see `.nvmrc`; Node.js 26 is incompatible with the current Firebase dependencies)
- npm (v6 or higher recommended)

### Installation

Clone the repository to your local machine:

```bash
git clone https://github.com/r97draco/grecipe.git
cd grecipe
```

#### Client Setup

Navigate to the client directory and install the dependencies:

```bash
cd client
npm install
```

To start the client development server:

```bash
npm start
```

The application should now be running on [http://localhost:3000](http://localhost:3000).

#### Server Setup

Navigate to the server directory and install the dependencies:

```bash
cd server
npm install
```

To start the server for development:

```bash
npm run dev
```

The server will be running on [http://localhost:9191](http://localhost:9191).

### Local database

The server creates a SQLite database at `server/data/grecipe.sqlite` automatically. No database installation or MongoDB account is required. This local data is excluded from Git. Set `SQLITE_PATH` in `server/.env` to override the file location. Existing MongoDB data is not imported automatically.

### Environment Variables

Client .env :
```
REACT_APP_VERSION = v1.0
REACT_APP_API_URL=http://localhost:9191
# For server : https://grecipe.onrender.com
```

Server `.env` (use your own credentials):
```
PORT=9191
NODE_ENV=development
SPOONACULAR_API_KEY=your_spoonacular_api_key
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT=your_client_certificate_url
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
```

Replace the values with your actual configuration details.

## Features

- **Advanced Authentication**: Secure authentication system using `jsonwebtoken` and `firebase-admin`.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## Acknowledgements

- [Axios](https://axios-http.com/)
- [Firebase](https://firebase.google.com/)
- ...and all other fantastic open-source projects.
