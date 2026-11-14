const userService = require('../services/UserService');
const createUser = async (req, res, next) => {
  console.log('Creating User Hit');
  try {
    const user = await userService.createUser({
      email: req.body.email,
      userName: req.body.userName,
      photoURL: req.body.photoURL,
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  console.log('Get User Hit');
  try {
    console.log('req', req.query);
    const user = await userService.getUserByEmail(req.query.email);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { userName, photoURL } = req.body;
    const data = { userName, photoURL };
    const user = await userService.updateUserById(req.params.userId, data);
    res.status(200).json(user);
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUserById(req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser,
};
