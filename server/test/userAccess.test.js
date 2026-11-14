const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.SQLITE_PATH = ':memory:';
const authPath = require.resolve('../src/middlewares/auth');
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports(req,res,next) {
  if (!req.headers.authorization) return res.status(401).json({message:'Unauthorized'});
  req.user = {email:'self@example.com'};
  next();
}};
const express = require('express');
const users = require('../src/services/UserService');
const store = require('../src/database/sqlite');
test('user API requires authentication and prevents access to another account', async () => {
  const other = await users.createUser({email:'other@example.com',userName:'Other'});
  const app = express(); app.use(express.json()); app.use('/user', require('../src/routes/UserRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}/user`;
  const headers = {Authorization:'test-only', 'Content-Type':'application/json'};
  try {
    assert.equal((await fetch(base+'/getuser?email=self@example.com')).status,401);
    assert.equal((await fetch(base+'/getuser?email=other@example.com',{headers})).status,403);
    assert.equal((await fetch(base+'/'+other._id,{method:'DELETE',headers})).status,403);
    const created = await fetch(base+'/createuser',{method:'POST',headers,body:JSON.stringify({email:'self@example.com',userName:'Self'})});
    assert.equal(created.status,201);
    const profile = await created.json();
    const update = await fetch(base+'/updateuser/'+profile._id,{method:'PUT',headers,body:JSON.stringify({userName:'Updated',isFamilyHead:true})});
    assert.equal(update.status,200);
    const saved = await update.json();
    assert.equal(saved.userName,'Updated'); assert.equal(saved.isFamilyHead,false);
  } finally { await new Promise(resolve => server.close(resolve)); store.db.close(); }
});
