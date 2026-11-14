const axios = require('axios');
const { db } = require('../database/sqlite');
const ApiError = require('../utils/ApiError');

db.exec('CREATE TABLE IF NOT EXISTS nutrition_cache (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL, expires_at INTEGER NOT NULL)');
const pending = new Map();
async function cached(key,fetcher) {
  const stored = db.prepare('SELECT payload FROM nutrition_cache WHERE cache_key = ? AND expires_at > ?').get(key,Date.now());
  if(stored) return JSON.parse(stored.payload);
  if(pending.has(key)) return pending.get(key);
  const promise = (async()=>{
    const data=await fetcher();
    db.prepare('INSERT OR REPLACE INTO nutrition_cache(cache_key,payload,expires_at) VALUES(?,?,?)').run(key,JSON.stringify(data),Date.now()+7*86400000);
    db.prepare('DELETE FROM nutrition_cache WHERE expires_at < ?').run(Date.now());
    return data;
  })();
  pending.set(key,promise);
  try{return await promise;}finally{pending.delete(key);}
}
async function providerGet(provider,url,options={}) {
  try{return (await axios.get(url,{...options,timeout:15000})).data;}
  catch(error){
    const status=error.response?.status;
    if(status===404) throw new ApiError(404,'No food was found. Try another name or barcode.');
    if(status===429) throw new ApiError(429,`${provider} is busy. Please try again in a few minutes.`);
    if(status===401||status===403) throw new ApiError(503,`${provider} access is unavailable. Check the server API key.`);
    throw new ApiError(502,`Couldn’t reach ${provider}. Please try again.`);
  }
}
function usdaKey(){
  if(!process.env.USDA_API_KEY) throw new ApiError(503,'USDA nutrition lookup is not configured.');
  return process.env.USDA_API_KEY;
}
function number(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
function nutrient(food,id){const item=(food.foodNutrients||[]).find(n=>(n.nutrient?.id ?? n.nutrientId)===id);return number(item?.amount ?? item?.value);}
function usdaFood(food){
  return {provider:'usda',id:String(food.fdcId),name:food.description,brand:food.brandName||food.brandOwner||'',basis:'Per 100 g',
    serving:food.householdServingFullText||'',
    nutrients:{calories:nutrient(food,1008) ?? nutrient(food,2048) ?? nutrient(food,2047) ?? (nutrient(food,1062)!==null?nutrient(food,1062)/4.184:null),protein:nutrient(food,1003),carbs:nutrient(food,1005),fat:nutrient(food,1004),fiber:nutrient(food,1079),sugars:nutrient(food,2000),saturatedFat:nutrient(food,1258),sodium:nutrient(food,1093)},
    ingredients:food.ingredients||'',source:'USDA FoodData Central',sourceUrl:`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,attribution:'USDA FoodData Central · CC0'};
}
async function search(query){
  return cached(`usda:search:${query.toLowerCase()}`,async()=>{
    const data=await providerGet('USDA','https://api.nal.usda.gov/fdc/v1/foods/search',{params:{api_key:usdaKey(),query,pageSize:8,dataType:'Foundation,SR Legacy,Survey (FNDDS)'}});
    return {foods:(data.foods||[]).map(food=>({id:String(food.fdcId),name:food.description,type:food.dataType}))};
  });
}
async function details(id){return cached(`usda:food:${id}`,async()=>usdaFood(await providerGet('USDA',`https://api.nal.usda.gov/fdc/v1/food/${id}`,{params:{api_key:usdaKey()}})));}
async function barcode(code){
  return cached(`off:barcode:${code}`,async()=>{
    const data=await providerGet('Open Food Facts',`https://world.openfoodfacts.org/api/v3/product/${code}`,{params:{fields:'code,product_name,brands,nutriments,serving_size,ingredients_text,allergens_tags,quantity'},headers:{'User-Agent':'Grecipe-Project/1.0 (github.com/r97draco/grecipe-project)'}});
    const product=data.product;
    if(!product?.product_name)throw new ApiError(404,'This barcode was not found. Try USDA food search instead.');
    const n=product.nutriments||{};
    return {provider:'openfoodfacts',id:code,name:product.product_name,brand:product.brands||'',basis:'Per 100 g / 100 ml',serving:product.serving_size||'',packageSize:product.quantity||'',
      nutrients:{calories:number(n['energy-kcal_100g']) ?? (number(n.energy_100g)!==null?number(n.energy_100g)/4.184:null),protein:number(n.proteins_100g),carbs:number(n.carbohydrates_100g),fat:number(n.fat_100g),fiber:number(n.fiber_100g),sugars:number(n.sugars_100g),saturatedFat:number(n['saturated-fat_100g']),sodium:number(n.sodium_100g)!==null?number(n.sodium_100g)*1000:null},
      ingredients:product.ingredients_text||'',allergens:(product.allergens_tags||[]).map(name=>name.replace(/^\w\w:/,'')),source:'Open Food Facts',sourceUrl:`https://world.openfoodfacts.org/product/${code}`,attribution:'Open Food Facts · Open Database License (ODbL)'};
  });
}
module.exports={search,details,barcode};
