const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const directory = mkdtempSync(join(tmpdir(), 'grecipe-sqlite-'));
process.env.SQLITE_PATH = join(directory, 'test.sqlite');
const users = require('../src/services/UserService');
const families = require('../src/services/FamilyService');
const items = require('../src/services/ItemService');
const store = require('../src/database/sqlite');

test('users, family membership, inventory, rollback, persistence and cleanup', async () => {
  try {
    const head = await users.createUser({ email: 'head@example.com', userName: 'Head' });
    const member = await users.createUser({ email: 'member@example.com', userName: 'Member' });
    assert.equal((await users.getUserByEmail(head.email))._id, head._id);
    await assert.rejects(users.createUser({ email: head.email }), /already exists/);
    const family = await families.createFamily({ name: 'Home', members: [head._id], userId: head._id });
    assert.equal((await users.getUserById(head._id)).isFamilyHead, true);
    await families.addMember(family._id, member._id);
    await families.addMember(family._id, member._id);
    assert.equal((await families.getFamilyById(family._id)).members.length, 2);
    await families.removeMember(family._id, member._id);
    assert.equal((await users.getUserById(member._id)).family, null);
    const groceries = await items.createItems([{familyId: family._id, name: 'Potato', quantity: 2, expiresAt:'2026-12-01'}]);
    assert.equal((await items.getItemsByFamily(family._id)).length, 1);
    assert.equal((await items.updateItem(groceries[0]._id, {quantity: 3})).quantity, 3);
    await assert.rejects(items.createItems([{familyId:family._id, name:'Onion'}, {familyId:'missing', name:'Invalid'}]));
    assert.equal((await items.getItemsByFamily(family._id)).length, 1);
    const persisted = execFileSync(process.execPath, ['-e', "console.log(require('./src/database/sqlite').all('items').length)"], {cwd:join(__dirname,'..'),env:process.env,encoding:'utf8'});
    assert.equal(persisted.trim(), '1');
    await families.deleteFamilyById(family._id);
    assert.equal((await users.getUserById(head._id)).family, null);
    assert.equal((await users.getUserById(head._id)).isFamilyHead, false);
    assert.equal((await items.getItemsByFamily(family._id)).length, 0);
    await users.deleteUserById(member._id);
    assert.equal(await users.getUserById(member._id), null);
  } finally { store.db.close(); rmSync(directory, {recursive:true,force:true}); }
});
