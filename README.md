# SkillBridge

SkillBridge is a full-stack skill-exchange platform that allows users to discover people with complementary skills, exchange knowledge, schedule learning sessions, and manage skill-swap requests.

The project is built with React on the frontend and Node.js/Express on the backend, with SQLite providing persistent data storage.

## Features

* User profiles with skills, departments, ratings, reviews, and availability
* Discover users based on skills they offer and skills they want to learn
* Skill matching
* Skill-swap requests
* Request acceptance and rejection
* Learning session scheduling
* Session management
* User reviews and ratings
* Skill Coins system
* Persistent database storage using SQLite
* REST API for frontend/backend communication
* Responsive dashboard interface

## Technology Stack

### Frontend

* React
* Vite
* JavaScript
* Tailwind CSS
* CSS

### Backend

* Node.js
* Express.js
* REST API

### Database

* SQLite
* Better-SQLite3

### Development Tools

* npm
* Git
* GitHub
* VS Code

## Project Architecture

```text
SkillBridge/
│
├── server/
│   ├── db.js
│   ├── server.js
│   └── routes/
│       ├── profile.routes.js
│       ├── requests.routes.js
│       ├── sessions.routes.js
│       └── users.routes.js
│
├── src/
│   ├── components/
│   │   ├── modals/
│   │   │   ├── ModalShell.jsx
│   │   │   ├── RequestModal.jsx
│   │   │   ├── ReviewModal.jsx
│   │   │   └── SessionModal.jsx
│   │   ├── Avatar.jsx
│   │   ├── MatchBar.jsx
│   │   ├── Nav.jsx
│   │   ├── SkillTag.jsx
│   │   └── Toast.jsx
│   │
│   ├── pages/
│   │   ├── DiscoverPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── RequestsPage.jsx
│   │   └── SchedulePage.jsx
│   │
│   ├── App.jsx
│   ├── api.js
│   ├── data.js
│   ├── index.css
│   ├── main.jsx
│   └── utils.js
│
├── index.html
├── package.json
├── package-lock.json
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── README.md
```

## Application Architecture

The application follows a simple three-layer architecture:

```text
React Frontend
      |
      | HTTP Requests
      v
Express REST API
      |
      | SQL Queries
      v
SQLite Database
```

The React frontend is responsible for the user interface and user interactions.

The Express backend handles API requests, application logic, validation, and communication with the database.

SQLite provides persistent storage for users, skills, requests, sessions, profiles, and other application data.

## Database

SkillBridge uses SQLite instead of storing application data in JavaScript arrays.

The database is created and managed by:

```text
server/db.js
```

The SQLite database provides persistent storage, meaning data remains available after the backend server is stopped and restarted.

### Database Structure

The main entities in the database are:

```text
users
skills
user_skills
profiles
requests
sessions
coin_history
```

### Users

Stores the application's users.

| Column     | Description                            |
| ---------- | -------------------------------------- |
| id         | Unique user identifier                 |
| name       | User's display name                    |
| department | User's academic/department information |
| initials   | User initials used by the UI           |
| online     | Current online status                  |
| rating     | Average user rating                    |
| reviews    | Number of reviews                      |
| swaps      | Number of completed swaps              |

### Skills

Stores available skills.

| Column   | Description             |
| -------- | ----------------------- |
| id       | Unique skill identifier |
| name     | Skill name              |
| category | Skill category          |

### User Skills

Connects users with the skills they offer or want to learn.

```text
users
  |
  | user_id
  v
user_skills
  |
  | skill_id
  v
skills
```

A user can have multiple skills, and a skill can belong to multiple users.

The `type` field determines whether the user:

```text
offer
```

or

```text
want
```

the skill.

### Profiles

Stores additional information associated with a user's profile, including their Skill Coin balance.

### Requests

Stores skill-exchange requests between users.

A request connects:

```text
Sender
   |
   v
Receiver
   |
   +---- Offered Skill
   |
   +---- Requested Skill
```

Requests also contain their current status, such as pending, accepted, or rejected.

### Sessions

Stores scheduled skill-learning sessions between users.

Sessions contain information such as:

* Participants
* Skill
* Date
* Time
* Duration
* Session status

### Coin History

Tracks changes to a user's Skill Coin balance.

This allows the system to keep a record of Skill Coin transactions rather than simply storing the current balance.

## REST API

The frontend communicates with the backend through REST API endpoints.

### Users

```text
GET /api/users
GET /api/users/:id
```

Used to retrieve user information.

### Profiles

```text
GET /api/profile/:id
PUT /api/profile/:id
```

Used to retrieve and update user profile information.

### Requests

```text
GET /api/requests
POST /api/requests
PUT /api/requests/:id
```

Used to create and manage skill-exchange requests.

### Sessions

```text
GET /api/sessions
POST /api/sessions
PUT /api/sessions/:id
DELETE /api/sessions/:id
```

Used to create and manage scheduled learning sessions.

## Installation

Clone the repository:

```bash
git clone https://github.com/rickkyalo-glitch/SkillBridge.git
```

Navigate into the project:

```bash
cd SkillBridge
```

Install the dependencies:

```bash
npm install
```

## Running the Application

SkillBridge requires both the backend and frontend development servers.

### Start the Backend

Open a terminal and run:

```bash
npm run server
```

The Express server will start and provide the REST API.

### Start the Frontend

Open a second terminal and run:

```bash
npm run dev
```

Vite will provide a local development URL, normally:

```text
http://localhost:5173
```

Open that address in your browser.

## Database Setup

The SQLite database is initialized automatically when the backend starts.

The database file is:

```text
skillbridge.db
```

The database should not be manually edited during normal development.

If the database needs to be reset to the initial demo state, run:

```bash
npm run db:reset
```

Then restart the backend:

```bash
npm run server
```

## Environment Variables

Environment-specific configuration can be placed in a `.env` file.

A sample configuration is provided in:

```text
.env.example
```

Do not commit sensitive environment variables or credentials to GitHub.

## Available Commands

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Start the backend server:

```bash
npm run server
```

Reset the SQLite database:

```bash
npm run db:reset
```

Build the frontend for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Data Persistence

The original application stored data in JavaScript objects and arrays. This meant that changes could be lost whenever the backend restarted.

The current implementation uses SQLite:

```text
React
  |
  v
Express API
  |
  v
SQLite
```

This provides persistent storage for application data.

For example, creating a new request through the frontend results in:

```text
User
  |
  v
React Request Modal
  |
  v
POST /api/requests
  |
  v
Express Route
  |
  v
SQLite
  |
  v
requests table
```

The request remains in the database after the server is restarted.

## Development Notes

The frontend and backend are intentionally separated.

Frontend code is located in:

```text
src/
```

Backend code is located in:

```text
server/
```

Database initialization and database operations are handled through:

```text
server/db.js
```

API route logic is separated into individual route files under:

```text
server/routes/
```

This structure makes it easier to add new functionality without placing the entire backend inside a single file.

Ring Integration — Upstream & Downstream APIs

SkillBridge now implements both sides of the Week 2–3 API contract with our ring partners. As the downstream provider for Farmers-AgroConnect, it exposes GET /experts (with estate and proximity filtering), GET /experts/:id, GET /experts/:id/availability, GET /experts/:id/reviews, GET /skills?tag=, and a consultation-booking endpoint on POST /requests — all matching the endpoints agreed in ENDPOINT_LIST.md. As the upstream consumer of Maji Website, SkillBridge calls their stations, estates, payment-methods, and deliveries endpoints through a dedicated adapter (server/services/majiClient.js) that's proxied through our own backend rather than exposed to the frontend directly. Since Maji Website's live API details weren't available yet, the adapter falls back to schema-accurate mock data (clearly flagged with "source": "mock" in every response) so the integration is fully built, testable, and demoable today, and becomes live with a one-line environment variable change once Team 4 shares their real endpoint.

## Future Improvements

Potential future improvements include:

* User authentication and authorization
* Password hashing and secure login
* JWT or session-based authentication
* Real-time notifications
* WebSocket-based online status
* Advanced skill-matching algorithms
* Search and filtering
* Skill Coin transactions between users
* Email notifications
* File and image uploads
* Automated testing
* API documentation with Swagger/OpenAPI
* PostgreSQL migration for production deployments
* Deployment using a cloud hosting platform

## Project Purpose

SkillBridge was developed as a full-stack application demonstrating the integration of a modern React frontend, RESTful backend services, and relational database persistence.

The project demonstrates concepts including:

* Component-based frontend development
* REST API design
* CRUD operations
* Relational database design
* Database relationships
* State management
* Form handling
* Modal-based user interactions
* Backend routing
* Persistent data storage
* Full-stack application architecture

## License

This project is intended for educational and portfolio purposes.
