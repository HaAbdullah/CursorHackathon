# Database

SQLite, zero setup. `schema.sql` runs automatically when the backend starts
(see `backend/src/db.js`), creating `app.sqlite` in this folder if it doesn't
exist yet.

Edit `schema.sql` to add tables. The backend re-applies it (via
`CREATE TABLE IF NOT EXISTS`) on every start, so add new tables there rather
than editing the generated `.sqlite` file directly.
