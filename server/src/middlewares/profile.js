const users=require('../services/UserService');
module.exports=async(req,res,next)=>{
  try{
    const profile=await users.getUserByEmail(req.user.email);
    if(!profile)return res.status(404).json({message:'Create your profile first.'});
    req.profile=profile;next();
  }catch(error){next(error);}
};
