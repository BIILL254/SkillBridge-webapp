# SkillBridge

A full-stack **React + Node.js** platform that connects users with verified experts for skill-sharing, consultation booking, and delivery-supported services. SkillBridge helps users discover nearby experts, schedule sessions, submit consultation requests, and track logistics through an integrated delivery system.

Built as a semester project using **React**, **Express**, and **SQLite**.

---

## Preview

<Add screenshots or GIFs here after deployment>

---

## Features

### Expert Discovery

* Browse verified expert profiles.
* Filter experts by **estate**.
* Sort by **rating** or **proximity**.
* View detailed expert profiles.

### Skills Marketplace

* Browse categorized skills.
* Filter skills using tags such as:

  * Agronomy
  * Soil Health
  * Irrigation Systems

### Consultation Booking

* View expert availability.
* Book consultation sessions.
* Submit learning requests.
* Track request status.

### Reviews

* View expert ratings.
* Read review summaries.
* See completed session statistics.

### Logistics Integration

* Discover nearby vendor stations.
* View supported estates.
* Check available payment methods.
* Create delivery requests.
* Track delivery status.

---

## Tech Stack

<row gap=3 align=center><AsyncImage query="React logo" aspectRatio="1:1" maxWidth=36 maxHeight=36/><AsyncImage query="Vite logo" aspectRatio="1:1" maxWidth=36 maxHeight=36/><AsyncImage query="Node.js logo" aspectRatio="1:1" maxWidth=36 maxHeight=36/><AsyncImage query="Express.js logo" aspectRatio="1:1" maxWidth=36 maxHeight=36/><AsyncImage query="SQLite logo" aspectRatio="1:1" maxWidth=36 maxHeight=36/></row>

| Layer         | Technology              |
| ------------- | ----------------------- |
| Frontend      | React 18 + Vite         |
| Backend       | Node.js + Express       |
| Database      | SQLite (better-sqlite3) |
| Styling       | CSS                     |
| API           | REST                    |
| Documentation | OpenAPI 3.0.3           |

---

## Project Structure

```text
SkillBridge-webapp-main/
│
├── src/
│   ├── components/
│   ├── documentation/
│   ├── App.jsx
│   └── api.js
│
├── server/
│   ├── routes/
│   ├── services/
│   ├── server.js
│   ├── schema.sql
│   └── seed.sql
│
├── openapi.yaml
├── package.json
└── README.md
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/muthokaricky-alt/SkillBridge-webapp.git
cd SkillBridge-webapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Update any required values inside `.env`.

### 4. Reset the database (optional)

```bash
npm run db:reset
```

### 5. Start the backend

```bash
npm run server
```

### 6. Start the frontend

Open another terminal:

```bash
npm run dev
```

The application will be available at:

* Frontend: `http://localhost:5173`
* Backend: `http://localhost:3000`

---

## API Endpoints

### Experts

| Method | Endpoint                     | Description        |
| ------ | ---------------------------- | ------------------ |
| GET    | `/experts`                   | Get experts        |
| GET    | `/experts/{id}`              | Get expert details |
| GET    | `/experts/{id}/availability` | Get availability   |
| GET    | `/experts/{id}/reviews`      | Get reviews        |

### Skills

| Method | Endpoint  | Description          |
| ------ | --------- | -------------------- |
| GET    | `/skills` | Get skill categories |

### Requests

| Method | Endpoint    | Description                 |
| ------ | ----------- | --------------------------- |
| POST   | `/requests` | Create consultation request |

### Logistics

| Method | Endpoint           | Description           |
| ------ | ------------------ | --------------------- |
| GET    | `/stations`        | Get vendor stations   |
| GET    | `/estates`         | Get supported estates |
| GET    | `/payment-methods` | Get payment methods   |
| GET    | `/deliveries/{id}` | Track delivery        |
| POST   | `/deliveries`      | Create delivery       |

---

## OpenAPI Documentation

This project includes an OpenAPI 3.0.3 specification.

* `openapi.yaml`

To validate it:

1. Open **Swagger Editor**.
2. Paste `openapi.yaml`.
3. Verify there are zero validation errors.

---

## Database

SkillBridge uses **SQLite** with:

* `schema.sql` – database structure
* `seed.sql` – sample data
* `skillbridge.db` – local database

Reset the database anytime with:

```bash
npm run db:reset
```

---

## Development Scripts

| Command              | Purpose                   |
| -------------------- | ------------------------- |
| `npm run dev`        | Start Vite                |
| `npm run build`      | Production build          |
| `npm run preview`    | Preview build             |
| `npm run server`     | Start Express server      |
| `npm run server:dev` | Start server with Nodemon |
| `npm run db:reset`   | Reset SQLite database     |

---

## Documentation

Additional documentation is located in:

```text
src/documentation/
```

Including:

* API_NEEDS.md
* DATABASE.md
* ENDPOINT_LIST.md
* CONTRIBUTORS.md
* CONTRACT_QUESTIONS.md

---

## Future Improvements

* User authentication
* JWT authorization
* Real-time chat
* Notifications
* Image uploads
* Deployment (Render/Vercel)
* Mobile responsiveness improvements
* Analytics dashboard

---

## Contributors

Developed as a collaborative university project.

See:

```text
src/documentation/CONTRIBUTORS.md
```

---

## License

This project is intended for educational purposes as part of a university software engineering project.


