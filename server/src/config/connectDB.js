module.exports = async () => {
  const { db } = require('../database/sqlite');
  db.prepare('SELECT 1').get();
  console.log('SQLite database ready');
};
