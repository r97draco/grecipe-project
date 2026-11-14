const express = require('express');
const {
  createUser,
  getUser,
  deleteUser,
  updateUser,
} = require('../controllers/UserController');
const validate = require('../middlewares/validate');
const userSchema = require('../validation/ValUser');
const router = express.Router();
const auth = require('../middlewares/auth');
const users = require('../services/UserService');
router.use(auth);
router.use((req, res, next) => {
  const email = req.query.email || req.body.email;
  if (email && email !== req.user.email) return res.status(403).json({ message: 'You can only access your own account' });
  next();
});
router.param('userId', async (req, res, next, id) => {
  try {
    const profile = await users.getUserById(id);
    if (!profile) return res.status(404).json({ message: 'User not found' });
    if (profile.email !== req.user.email) return res.status(403).json({ message: 'You can only access your own account' });
    next();
  } catch (error) { next(error); }
});

router.get('/getuser', getUser);

router.delete('/:userId', validate(userSchema.deleteUser), deleteUser);

router.post('/createuser', validate(userSchema.createUser), createUser);

router.put('/updateuser/:userId', validate(userSchema.updateUser), updateUser);

router.get('/testinguser', (req, res) => {
  res.send('Hello World!');
});

module.exports = router;
