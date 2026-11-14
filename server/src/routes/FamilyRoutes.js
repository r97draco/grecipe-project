const express = require('express');
const {
  createFamily,
  getFamily,
  updateFamilyMembers,
  deleteFamily,
  getAllFamilies,
} = require('../controllers/FamilyController');
const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const familySchema = require('../validation/ValFamily');
const router = express.Router();
router.use(authMiddleware, require('../middlewares/profile'));

router.post(
  '/createfamily',
  validate(familySchema.createFamily),
  createFamily
);

router.get('/getallfamilies', getAllFamilies);

router.get(
  '/:familyId',
  validate(familySchema.getFamily),
  getFamily
);

router.put(
  '/updatefamily/:familyId',
  validate(familySchema.updateFamily),
  updateFamilyMembers
);

router.delete(
  '/:familyId',
  validate(familySchema.deleteFamily),
  deleteFamily
);

module.exports = router;
