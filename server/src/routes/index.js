const express = require('express');
//Import Family User and Recipe routes
const userRoutes = require('./UserRoutes');
const familyRoutes = require('./FamilyRoutes');
const recipeRoutes = require('./RecipeRoutes');
const itemRoutes = require('./ItemRoutes');

const router = express.Router();
router.use('/health', require('./HealthRoutes'));
router.use('/nutrition', require('./NutritionRoutes'));

//Add routes
router.use('/user', userRoutes);
router.use('/family', familyRoutes);
router.use('/recipe', recipeRoutes);
router.use('/item', itemRoutes);

module.exports = router;
