database server during development.

The database is stored at:

```text
skillbridge.db
```

On the first API startup, `server/db.js`:

1. Opens the SQLite database.
2. Enables foreign-key enforcement.
3. Enables SQLite WAL mode.
4. Creates the required tables if they do not exist.
5. Inserts the initial demo data if the database is empty.

### Database schema

```text
users
  │
  ├─────────────── profiles
  │
  └──────┐
         │
         ▼
   user_skills ◄──── skills

users ─────────────── requests

sessions

users ─────────────── coin_history
```

### Tables

| Table | Purpose |
|---|---|
| `users` | Stores SkillBridge users and basic profile statistics. |
| `skills` | Stores unique skill names. |
| `user_skills` | Many-to-many relationship between users and skills, including whether a skill is offered 
