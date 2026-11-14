const express=require('express');
const auth=require('../middlewares/auth');
const nutrition=require('../services/NutritionService');
const router=express.Router();
router.use(auth);
router.get('/search',async(req,res,next)=>{
  const q=typeof req.query.q==='string'?req.query.q.trim():'';
  if(q.length<2||q.length>100)return res.status(400).json({message:'Enter a food name between 2 and 100 characters.'});
  try{res.json(await nutrition.search(q));}catch(error){next(error);}
});
router.get('/usda/:id',async(req,res,next)=>{
  if(!/^\d{1,12}$/.test(req.params.id))return res.status(400).json({message:'Invalid USDA food ID.'});
  try{res.json(await nutrition.details(req.params.id));}catch(error){next(error);}
});
router.get('/barcode/:code',async(req,res,next)=>{
  if(!/^\d{8,14}$/.test(req.params.code))return res.status(400).json({message:'Enter a barcode with 8 to 14 digits.'});
  try{res.json(await nutrition.barcode(req.params.code));}catch(error){next(error);}
});
module.exports=router;
