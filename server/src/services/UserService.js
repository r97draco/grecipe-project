const store = require('../database/sqlite');
const ApiError = require('../utils/ApiError');
const getUserById = async id => store.get('users', id);
const getUserByEmail = async email => store.all('users', 'email', email)[0] || null;
const createUser = async data => {
  try { return store.create('users', data); }
  catch (error) {
    if (error.message.includes('UNIQUE constraint')) throw new ApiError(409, 'User already exists');
    throw error;
  }
};
const updateUserById = async (id, data) => {
  if (!store.get('users', id)) throw new ApiError(404, 'User not found');
  return store.update('users', id, data);
};
const updateUserByIdForFamily = async (id, family) => updateUserById(id, { family, isFamilyHead: true });
const deleteUserById = async id => {
  const user = store.remove('users', id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};
module.exports = { createUser, getUserById, getUserByEmail, updateUserById, updateUserByIdForFamily, deleteUserById };
