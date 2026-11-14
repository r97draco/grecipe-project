const { test } = require('node:test');
const assert = require('node:assert/strict');
const admin = require('firebase-admin');
test('Firebase Auth rejects invalid tokens without a dependency crash', async () => {
  const app = admin.initializeApp({ projectId: 'local-regression-test' }, 'regression');
  try {
    await assert.rejects(admin.auth(app).verifyIdToken('invalid-token'), error => error.code === 'auth/argument-error');
  } finally { await app.delete(); }
});
