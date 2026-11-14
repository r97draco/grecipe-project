import { AxiosError, CanceledError } from 'axios';
const storageKey='grecipe-demo-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const dateIn=days=>{const d=new Date();d.setDate(d.getDate()+days);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
function seed(){
  return {version:1,userId:'demo-alex',users:[
    {_id:'demo-alex',userName:'Alex Morgan',email:'alex@demo.grecipe.test',family:'demo-kitchen',isFamilyHead:true,photoURL:'',isDemo:true},
    {_id:'demo-sam',userName:'Sam Lee',email:'sam@demo.grecipe.test',family:'demo-kitchen',isFamilyHead:false},
    {_id:'demo-taylor',userName:'Taylor Kim',email:'taylor@demo.grecipe.test',family:'demo-kitchen',isFamilyHead:false},
    {_id:'demo-jamie',userName:'Jamie Park',email:'jamie@demo.grecipe.test',family:'demo-roommates',isFamilyHead:true}
  ],families:[{_id:'demo-kitchen',name:'The Demo Kitchen'},{_id:'demo-roommates',name:'Roommates'}],items:[
    ['Eggs',6,7],['Spinach',1,2],['Tomato',4,3],['Banana',5,4],['Milk',1,6],['Chicken',2,1],['Rice',1,14],['Chickpeas',2,14],['Bread',1,-1],['Olive oil',1,14]
  ].map(([name,quantity,days],index)=>({_id:`demo-item-${index}`,familyId:'demo-kitchen',name,quantity,expiresAt:dateIn(days),expirySource:'default'}))};
}
let state=null;
try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(saved?.version===1&&Array.isArray(saved.users)&&Array.isArray(saved.families)&&Array.isArray(saved.items))state=saved;}catch{}
function persist(){try{if(state)sessionStorage.setItem(storageKey,JSON.stringify(state));else sessionStorage.removeItem(storageKey);}catch{}}
export const getDemoProfile=()=>state?clone(state.users.find(user=>user._id===state.userId)||null):null;
export function startDemoSession(){state=seed();persist();return getDemoProfile();}
export function clearDemoSession(){state=null;persist();}
function family(id){const f=state.families.find(item=>item._id===id);return f?{...f,members:state.users.filter(user=>user.family===id)}:null;}
const ingredient=name=>({name,original:name});
const recipeDefinitions=[
  {id:'demo-omelette',image:'/demo/omelette.svg',title:'Spinach & tomato omelette',ingredients:['Eggs','Spinach','Tomato','Olive oil']},
  {id:'demo-bowl',image:'/demo/bowl.svg',title:'Chickpea rice bowl',ingredients:['Chickpeas','Rice','Tomato','Lemon']},
  {id:'demo-chicken',image:'/demo/chicken.svg',title:'Chicken & spinach skillet',ingredients:['Chicken','Spinach','Olive oil','Garlic']},
  {id:'demo-toast',image:'/demo/toast.svg',title:'Eggs on toast',ingredients:['Eggs','Bread']}
];
function recipes(names){const available=names.map(name=>name.toLowerCase().replace(/s$/,''));return recipeDefinitions.map(recipe=>{
  const used=recipe.ingredients.filter(name=>available.includes(name.toLowerCase().replace(/s$/,'')));
  const missed=recipe.ingredients.filter(name=>!used.includes(name));
  return {...recipe,usedIngredientCount:used.length,missedIngredientCount:missed.length,usedIngredients:used.map(ingredient),missedIngredients:missed.map(ingredient),unusedIngredients:names.filter(name=>!used.some(item=>item.toLowerCase()===name.toLowerCase())).map(ingredient)};
}).filter(recipe=>recipe.usedIngredientCount>0);}
const sampleMacros={banana:[89,1.1,22.8,.3],eggs:[143,12.6,.7,9.5],spinach:[23,2.9,3.6,.4],tomato:[18,.9,3.9,.2],milk:[61,3.2,4.8,3.3],rice:[130,2.7,28.2,.3],chickpeas:[164,8.9,27.4,2.6],chicken:[165,31,0,3.6],bread:[247,13,41,4.2],'olive oil':[884,0,0,100]};
function nutrition(name){const values=sampleMacros[name.toLowerCase()]||[null,null,null,null];return {provider:'usda',id:`demo-food-${encodeURIComponent(name)}`,name,brand:'Demo sample',basis:'Per 100 g · sample data',nutrients:{calories:values[0],protein:values[1],carbs:values[2],fat:values[3],fiber:null,sugars:null,saturatedFat:null,sodium:null},source:'Demo nutrition sample',sourceUrl:'https://fdc.nal.usda.gov/',attribution:'Illustrative demo data'};}
function execute(config){
  const path=new URL(config.url,window.location.origin).pathname.split('/api/')[1]||'';
  const method=(config.method||'get').toLowerCase();
  let body=config.data;
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{body={};}}
  const params=config.params||{};const profile=state.users.find(user=>user._id===state.userId);
  let data;let status=200;
  if(path==='user/getuser')data=profile;
  else if(path==='family/getallfamilies')data=state.families.map(item=>family(item._id));
  else if(path==='family/createfamily'&&method==='post'){
    const f={_id:crypto.randomUUID(),name:body.name};state.families.push(f);profile.family=f._id;profile.isFamilyHead=true;data=family(f._id);status=201;
  }else if(path.startsWith('family/updatefamily/')&&method==='put'){
    const id=path.split('/').pop();const member=state.users.find(user=>user._id===body.memberId);
    if(!family(id)||!member)throw new Error('Family member not found');
    if(body.action==='add'){member.isFamilyHead=family(id).members.length===0;member.family=id;}
    else {member.family=null;member.isFamilyHead=false;const remaining=state.users.filter(user=>user.family===id);if(remaining.length&&!remaining.some(user=>user.isFamilyHead))remaining[0].isFamilyHead=true;}
    data={family:family(id)};
  }else if(path.startsWith('family/'))data=family(path.split('/').pop());
  else if(path==='item/family')data=state.items.filter(item=>item.familyId===params.familyId);
  else if(path==='item/add'&&method==='post'){
    data=(body.items||[]).map(item=>({...item,_id:crypto.randomUUID(),familyId:profile.family}));state.items.push(...data);status=201;
  }else if(path.startsWith('item/update/')&&method==='put'){
    const item=state.items.find(item=>item._id===path.split('/').pop());if(!item)throw new Error('Item not found');Object.assign(item,body);data=item;
  }else if(path.startsWith('item/delete/')&&method==='delete'){
    state.items=state.items.filter(item=>item._id!==path.split('/').pop());status=204;data=null;
  }else if(path==='item/upload')data={items:[{name:'Banana',quantity:2,sourceLine:'2 x BANANAS 2.99',quantitySource:'receipt'},{name:'Milk',quantity:1,sourceLine:'MILK 3.49',quantitySource:'unconfirmed'},{name:'Bread',quantity:1,sourceLine:'BREAD 2.79',quantitySource:'unconfirmed'}].map(item=>({...item,expiresAt:dateIn(14),expirySource:'default',matchType:'matched'}))};
  else if(path.startsWith('recipe/')){
    const names=method==='post'?body.ingredients:state.items.filter(item=>item.familyId===profile.family).map(item=>item.name);data={recipes:recipes(names)};
  }else if(path==='nutrition/search')data={foods:[{id:`demo-food-${encodeURIComponent(params.q)}`,name:params.q,type:'Demo sample'}]};
  else if(path.startsWith('nutrition/usda/'))data=nutrition(decodeURIComponent(path.slice('nutrition/usda/demo-food-'.length)));
  else if(path.startsWith('nutrition/barcode/')){
    if(path.split('/').pop()!=='3017620422003')throw new Error('For the demo, try barcode 3017620422003.');
    data={...nutrition('Nutella'),id:'3017620422003',provider:'openfoodfacts',name:'Nutella',brand:'Demo barcode example',nutrients:{calories:539,protein:6.3,carbs:57.5,fat:30.9},source:'Open Food Facts · demo sample',sourceUrl:'https://world.openfoodfacts.org/product/3017620422003',attribution:'Open Food Facts · ODbL'};
  }else throw new Error('This action is not part of the demo.');
  persist();return {data:clone(data??null),status,statusText:'OK',headers:{},config};
}
export function demoAdapter(config){return new Promise((resolve,reject)=>{
  if(config.signal?.aborted)return reject(new CanceledError());
  const abort=()=>{clearTimeout(timer);reject(new CanceledError());};
  const timer=setTimeout(()=>{
    config.signal?.removeEventListener('abort',abort);
    if(!state||config.signal?.aborted)return reject(new CanceledError());
    try{resolve(execute(config));}catch(error){reject(new AxiosError(error.message,'ERR_BAD_REQUEST',config,null,{status:400,data:{message:error.message},config}));}
  },180);
  config.signal?.addEventListener('abort',abort,{once:true});
});}
