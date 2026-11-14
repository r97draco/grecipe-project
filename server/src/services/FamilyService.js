const store = require('../database/sqlite');
const ApiError = require('../utils/ApiError');
function familyWithMembers(id) {
  const family = store.get('families', id);
  return family ? { ...family, members: store.all('users', 'family', id) } : null;
}
const createFamily = async data => store.transaction(() => {
  const family = store.create('families', data);
  const members = [...new Set([...(data.members || []), ...(data.userId ? [data.userId] : [])])];
  members.forEach((id, index) => {
    if (!store.get('users', id)) throw new ApiError(404, 'User not found');
    store.update('users', id, { family: family._id, isFamilyHead: index === 0 });
  });
  return familyWithMembers(family._id);
});
const getFamilyById = async id => familyWithMembers(id);
const findAll = async () => store.all('families').map(f => familyWithMembers(f._id));
const addMember = async (familyId, memberId) => store.transaction(() => {
  const family = familyWithMembers(familyId);
  if (!family) throw new ApiError(404, 'Family not found');
  const user = store.get('users', memberId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.family !== familyId) store.update('users', memberId, { family: familyId, isFamilyHead: family.members.length === 0 });
  return familyWithMembers(familyId);
});
const removeMember = async (familyId, memberId) => store.transaction(() => {
  if (!store.get('families', familyId)) throw new ApiError(404, 'Family not found');
  const user = store.get('users', memberId);
  if (user?.family === familyId) store.update('users', memberId, { family: null, isFamilyHead: false });
  const remaining=store.all('users','family',familyId);
  if(remaining.length&&!remaining.some(member=>member.isFamilyHead))store.update('users',remaining[0]._id,{isFamilyHead:true});
  return familyWithMembers(familyId);
});
const deleteFamilyById = async id => store.transaction(() => {
  store.all('users', 'family', id).forEach(user => store.update('users', user._id, { isFamilyHead: false }));
  store.remove('families', id);
});
module.exports = { createFamily, getFamilyById, findAll, addMember, removeMember, deleteFamilyById };
