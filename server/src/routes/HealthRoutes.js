const express = require('express');
const Joi = require('joi');
const { db } = require('../database/sqlite');
const auth = require('../middlewares/auth');
const profile = require('../middlewares/profile');
const router = express.Router();

// Health details are separate from user records returned to family members.
db.exec(`CREATE TABLE IF NOT EXISTS health_profiles (
  userId TEXT PRIMARY KEY REFERENCES users(_id) ON DELETE CASCADE, data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS exercise_sessions (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  reps INTEGER NOT NULL, seconds INTEGER NOT NULL, arm TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS exercise_sessions_user ON exercise_sessions(userId, createdAt);`);
const sessionColumns = db.prepare('PRAGMA table_info(exercise_sessions)').all();
for (const name of ['leftReps', 'rightReps']) {
  if (!sessionColumns.some(column => column.name === name)) db.exec(`ALTER TABLE exercise_sessions ADD COLUMN ${name} INTEGER`);
}
const schema = Joi.object({
  age: Joi.number().integer().min(1).max(120).allow(null),
  gender: Joi.string().valid('', 'female', 'male', 'other', 'prefer-not-to-say'),
  weight: Joi.number().positive().max(500).allow(null),
  height: Joi.number().positive().max(300).allow(null),
  goal: Joi.number().positive().max(500).allow(null),
  targetReps: Joi.number().integer().min(1).max(200).required(),
});
const sessionSchema = Joi.object({
  id: Joi.string().guid().required(),
  reps: Joi.number().integer().min(1).max(1000).required(),
  seconds: Joi.number().integer().min(0).max(86400).required(),
  arm: Joi.string().valid('left', 'right', 'both').required(),
  leftReps: Joi.number().integer().min(0).max(1000).when('arm', { is: 'both', then: Joi.required() }),
  rightReps: Joi.number().integer().min(0).max(1000).when('arm', { is: 'both', then: Joi.required() }),
}).custom((value, helpers) => {
  if (value.arm === 'both' && value.leftReps + value.rightReps !== value.reps) return helpers.message('Left and right counts must add up to the total reps.');
  return value;
});
router.use(auth, profile);
router.get('/', (req, res, next) => {
  try {
    const row = db.prepare('SELECT data FROM health_profiles WHERE userId = ?').get(req.profile._id);
    const sessions = db.prepare('SELECT id, reps, seconds, arm, leftReps, rightReps, createdAt FROM exercise_sessions WHERE userId = ? ORDER BY createdAt DESC LIMIT 10').all(req.profile._id);
    res.json({ profile: row ? JSON.parse(row.data) : { targetReps: 10 }, sessions });
  } catch (error) { next(error); }
});
router.put('/', (req, res, next) => {
  const { value, error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  try {
    db.prepare('INSERT INTO health_profiles (userId, data) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET data = excluded.data').run(req.profile._id, JSON.stringify(value));
    res.json(value);
  } catch (error) { next(error); }
});
router.post('/sessions', (req, res, next) => {
  const { value, error } = sessionSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  try {
    const existing = db.prepare('SELECT id FROM exercise_sessions WHERE id = ?').get(value.id);
    if (existing) return res.status(409).json({ message: 'This session has already been saved.' });
    const session = { ...value, createdAt: new Date().toISOString() };
    db.prepare('INSERT INTO exercise_sessions (id, userId, reps, seconds, arm, leftReps, rightReps, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(session.id, req.profile._id, session.reps, session.seconds, session.arm, session.leftReps ?? null, session.rightReps ?? null, session.createdAt);
    res.status(201).json(session);
  } catch (error) { next(error); }
});
module.exports = router;
