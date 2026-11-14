const items=require('../services/ItemService');
const store=require('../database/sqlite');
const ApiError=require('../utils/ApiError');
function familyId(req){
  if(!req.profile.family)throw new ApiError(400,'Join or create a family first.');
  if(req.query.familyId&&req.query.familyId!==req.profile.family)throw new ApiError(403,'You can only access your own family inventory.');
  if(req.query.email&&req.query.email!==req.user.email)throw new ApiError(403,'You can only access your own account.');
  return req.profile.family;
}
function values(body){
  const value={};
  for(const key of ['name','quantity','expiresAt','fooDBKey','expirySource'])if(body[key]!==undefined)value[key]=body[key];
  if(value.name!==undefined){if(typeof value.name!=='string'||!value.name.trim()||value.name.length>150)throw new ApiError(400,'Enter an item name.');value.name=value.name.trim();}
  if(value.quantity!==undefined){value.quantity=Number(value.quantity);if(!Number.isFinite(value.quantity)||value.quantity<=0)throw new ApiError(400,'Quantity must be greater than zero.');}
  if(value.expiresAt && (typeof value.expiresAt!=='string'||Number.isNaN(Date.parse(value.expiresAt))))throw new ApiError(400,'Enter a valid expiry date.');
  return value;
}
function ownedItem(req){const id=familyId(req);const item=store.get('items',req.params.id);if(!item)throw new ApiError(404,'Item not found');if(item.familyId!==id)throw new ApiError(403,'You can only change your own family inventory.');return item;}
const getItemsByFamily=async(req,res,next)=>{try{res.json(await items.getItemsByFamily(familyId(req)));}catch(error){next(error);}};
const getItemsByUser=getItemsByFamily;
const createItems=async(req,res,next)=>{
  try{
    const id=familyId(req);
    if(!Array.isArray(req.body.items)||!req.body.items.length||req.body.items.length>500)throw new ApiError(400,'Provide between 1 and 500 grocery items.');
    const data=req.body.items.map(item=>{const value=values(item);if(!value.name)throw new ApiError(400,'Every item needs a name.');return {...value,familyId:id};});
    res.status(201).json(await items.createItems(data));
  }catch(error){next(error);}
};
const createItem=async(req,res,next)=>{try{res.status(201).json(await items.createItem({...values(req.body),familyId:familyId(req)}));}catch(error){next(error);}};
const updateItem=async(req,res,next)=>{try{ownedItem(req);res.json(await items.updateItem(req.params.id,values(req.body)));}catch(error){next(error);}};
const deleteItem=async(req,res,next)=>{try{ownedItem(req);await items.deleteItem(req.params.id);res.status(204).end();}catch(error){next(error);}};
module.exports={getItemsByFamily,getItemsByUser,createItems,createItem,updateItem,deleteItem};
