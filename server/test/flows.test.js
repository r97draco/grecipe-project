const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const recipes = require('../src/services/RecipeService');
const receipt = require('../src/controllers/ReceiptController');
const { parseReceiptText } = require('../src/utils/inventory');

test('recipe search sends ingredient names and handles missing configuration', async () => {
  const originalKey = process.env.SPOONACULAR_API_KEY;
  const originalGet = axios.get;
  try {
    delete process.env.SPOONACULAR_API_KEY;
    await assert.rejects(recipes.searchRecipesByItems(['potato']), error => error.statusCode === 503);
    process.env.SPOONACULAR_API_KEY = 'test-only';
    let params;
    axios.get = async (url, options) => { params = options.params; return { data: [] }; };
    await recipes.searchRecipesByItems([{ name: 'Potato' }, ' onion ']);
    assert.equal(params.ingredients, 'Potato,onion');
    await assert.rejects(recipes.searchRecipesByItems([]), error => error.statusCode === 400);
  } finally {
    axios.get = originalGet;
    if (originalKey === undefined) delete process.env.SPOONACULAR_API_KEY;
    else process.env.SPOONACULAR_API_KEY = originalKey;
  }
});
test('receipt requests without an image return a handled validation error', async () => {
  let error;
  await receipt.parseReceipt({}, {}, value => { error = value; });
  assert.equal(error.statusCode, 400);
});
test('receipt parsing defaults to fourteen days ahead', () => {
  const NativeDate = Date;
  try {
    global.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2030-01-01T12:00:00Z'])); } };
    const result = parseReceiptText('potato');
    assert.ok(result.length);
    assert.equal(result[0].expiresAt, '2030-01-15');
  } finally { global.Date = NativeDate; }
});
