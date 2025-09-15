-- Run this on your Postgres DB if you prefer manual setup (optional).
CREATE TABLE IF NOT EXISTS voters (
  id SERIAL PRIMARY KEY,
  real_name TEXT UNIQUE NOT NULL,
  voted BOOLEAN DEFAULT FALSE,
  voted_for TEXT
);

INSERT INTO voters (real_name) VALUES
('Gaurav Kumar'),
('Shaksham Yadav'),
('Archit Bidasarya'),
('Ayush Kumar'),
('Archit Ki Behen'),
('Ayush Ki Behen')
ON CONFLICT (real_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

INSERT INTO candidates (name) VALUES
('MrCaptain7777'),
('.Yakshbhaiya7690'),
('archit_pro2013')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO settings (key, value) VALUES ('results_unlocked', 'false')
ON CONFLICT (key) DO NOTHING;
