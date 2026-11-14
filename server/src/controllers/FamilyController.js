const families=require('../services/FamilyService');
const ApiError=require('../utils/ApiError');
const createFamily=async(req,res,next)=>{
  try{
    if(req.profile.family)throw new ApiError(409,'Leave your current family before creating another.');
    res.status(201).json(await families.createFamily({name:req.body.name,members:[req.profile._id],userId:req.profile._id}));
  }catch(error){next(error);}
};
const getAllFamilies=async(req,res,next)=>{
  try{
    // Joining requires a name and member count, not other users’ contact details.
    res.json((await families.findAll()).map(family=>({...family,members:family.members.map(member=>({_id:member._id}))})));
  }catch(error){next(error);}
};
const getFamily=async(req,res,next)=>{
  try{
    if(req.profile.family!==req.params.familyId)throw new ApiError(403,'You can only view your own family.');
    const family=await families.getFamilyById(req.params.familyId);
    if(!family)throw new ApiError(404,'Family not found');
    res.json(family);
  }catch(error){next(error);}
};
const updateFamilyMembers=async(req,res,next)=>{
  try{
    const {action,memberId}=req.body;const id=req.params.familyId;let family;
    if(action==='add'){
      if(memberId!==req.profile._id)throw new ApiError(403,'Members must join using their own account.');
      if(req.profile.family&&req.profile.family!==id)throw new ApiError(409,'Leave your current family before joining another.');
      family=await families.addMember(id,memberId);
    }else if(action==='remove'){
      if(req.profile.family!==id || (memberId!==req.profile._id&&!req.profile.isFamilyHead))throw new ApiError(403,'Only the family head can remove other members.');
      family=await families.removeMember(id,memberId);
    }else throw new ApiError(400,'Invalid action');
    res.json({family});
  }catch(error){next(error);}
};
const deleteFamily=async(req,res,next)=>{
  try{
    if(req.profile.family!==req.params.familyId||!req.profile.isFamilyHead)throw new ApiError(403,'Only your family head can delete this family.');
    await families.deleteFamilyById(req.params.familyId);res.status(204).end();
  }catch(error){next(error);}
};
module.exports={createFamily,getAllFamilies,getFamily,updateFamilyMembers,deleteFamily};
