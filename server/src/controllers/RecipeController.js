const RecipeService = require('../services/RecipeService');
const itemsService = require('../services/ItemService');
const userService = require('../services/UserService');
const ApiError = require('../utils/ApiError');

const getRecipes = async (req, res, next) => {
  const { userId } = req.params;
  try {
    if(userId!==req.user.email)throw new ApiError(403,'You can only use your own inventory.');
    const user = await userService.getUserByEmail(userId);
    if (!user) throw new ApiError(404, 'User not found');
    if (!user.family) throw new ApiError(400, 'Join or create a family first');
    const ingredients = await itemsService.getItemsByFamily(user.family);
    const recipes = await RecipeService.searchRecipesByItems(ingredients);
    res.status(200).json({ recipes });
  } catch (err) {
    next(err);
  }
};

const getCustomRecipees = async (req, res, next) => {
  const { userId } = req.params;
  try {
    if(userId!==req.user.email)throw new ApiError(403,'You can only use your own inventory.');
    const user = await userService.getUserByEmail(userId);
    if (!user) throw new ApiError(404, 'User not found');
    const ingredients = req.body.ingredients;
    const recipes = await RecipeService.searchRecipesByItems(ingredients);
    res.status(200).json({ recipes });
  } catch (err) {
    next(err);
  }
};

const getMealPlans = async (req, res, next) => {
  try {
    const { diet, timeFrame = 'day', targetCalories } = req.query;
    const options = { timeFrame, ...(diet && { diet }), ...(targetCalories && { targetCalories }) };
    const mealPlans = await RecipeService.generateMealPlan(options);
    res.status(200).json({ mealPlans });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRecipes,
  getMealPlans,
  getCustomRecipees,
};
