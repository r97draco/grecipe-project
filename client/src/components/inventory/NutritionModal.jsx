import { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import { FiArrowLeft, FiArrowRight, FiBarChart2, FiHash, FiSearch, FiX } from 'react-icons/fi';
import { backendUrl } from '../../App';
import api, { isCanceled } from '../../utils/authenticatedApi';
import '../../css/Nutrition.css';

const format=(value,unit='g')=>value===null||value===undefined?'—':`${new Intl.NumberFormat(undefined,{maximumFractionDigits:1}).format(value)}${unit?' '+unit:''}`;
export default function NutritionModal({item,initial,onClose,onResult}) {
  const initialState=useRef({name:item.name,food:initial});
  const [food,setFood]=useState(initial || null);
  const [mode,setMode]=useState(initial?.provider==='openfoodfacts'?'barcode':'search');
  const [query,setQuery]=useState(item.name);
  const [barcode,setBarcode]=useState(initial?.provider==='openfoodfacts'?initial.id:'');
  const [foods,setFoods]=useState([]);
  const [searched,setSearched]=useState(false);
  const [loading,setLoading]=useState(!initial);
  const [error,setError]=useState('');
  const request=useRef(null);
  const active=useRef(true);
  const inFlight=useRef(!initial);
  useEffect(()=>{
    active.current=true;
    if(!initialState.current.food){
      const controller=new AbortController();request.current=controller;
      api.get(`${backendUrl}/api/nutrition/search`,{params:{q:initialState.current.name.slice(0,100)},signal:controller.signal}).then(response=>{
        if(active.current&&!controller.signal.aborted){setFoods(response.data.foods);setSearched(true);}
      }).catch(error=>{if(active.current&&!isCanceled(error))setError(error.response?.data?.message||'Couldn’t load food matches. Please try again.');})
        .finally(()=>{if(active.current&&!controller.signal.aborted){inFlight.current=false;setLoading(false);}});
    }
    return()=>{active.current=false;request.current?.abort();};
  },[]);
  const load=async(path,params,type)=>{
    if(inFlight.current)return;
    inFlight.current=true;
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    setLoading(true);setError('');
    try{
      const response=await api.get(`${backendUrl}/api/nutrition${path}`,{params,signal:controller.signal});
      if(!active.current||controller.signal.aborted)return;
      if(type==='search'){setFoods(response.data.foods);setSearched(true);setFood(null);}
      else{setFood(response.data);onResult(response.data);}
    }catch(error){if(active.current&&!controller.signal.aborted&&!isCanceled(error))setError(error.response?.data?.message||'Couldn’t load nutrition. Please try again.');}
    finally{if(active.current&&!controller.signal.aborted){inFlight.current=false;setLoading(false);}}
  };
  const changeMode=value=>{request.current?.abort();inFlight.current=false;setLoading(false);setError('');setMode(value);};
  const submit=event=>{
    event.preventDefault();
    if(mode==='search'&&query.trim().length>=2)load('/search',{q:query.trim()},'search');
    else if(mode==='barcode'&&/^\d{8,14}$/.test(barcode))load(`/barcode/${barcode}`,{},'food');
  };
  return <Modal isOpen onRequestClose={onClose} appElement={document.getElementById('root')} className="nutrition-modal" overlayClassName="inventory-dialog-backdrop" contentLabel={`Nutrition for ${item.name}`}>
    <header className="nutrition-heading"><div><span><FiBarChart2/>NUTRITION</span><h2>{item.name}</h2></div><button className="inventory-icon-button" onClick={onClose} aria-label="Close nutrition"><FiX/></button></header>
    <div className="nutrition-body">
      {food&&!loading ? <>
        <div className="nutrition-food-title"><div><h3>{food.name}</h3>{food.brand&&<p>{food.brand}</p>}<span>{food.basis}</span></div><button onClick={()=>{setFood(null);setError('');}} className="nutrition-change"><FiArrowLeft/>Change food</button></div>
        <div className="nutrition-macros">{[['calories','Calories','kcal'],['protein','Protein','g'],['carbs','Carbs','g'],['fat','Fat','g']].map(([key,label,unit])=><div key={key}><strong>{format(food.nutrients[key],'')}</strong><span>{label}<small>{unit}</small></span></div>)}</div>
        <dl className="nutrition-details">{[['fiber','Fibre','g'],['sugars','Sugars','g'],['saturatedFat','Saturated fat','g'],['sodium','Sodium','mg']].map(([key,label,unit])=><div key={key}><dt>{label}</dt><dd>{format(food.nutrients[key],unit)}</dd></div>)}{food.serving&&<div><dt>Label serving</dt><dd>{food.serving}</dd></div>}{food.packageSize&&<div><dt>Package size</dt><dd>{food.packageSize}</dd></div>}</dl>
        {food.ingredients&&<details className="nutrition-ingredients"><summary>Ingredients</summary><p>{food.ingredients}</p></details>}
        {food.allergens?.length>0&&<p className="nutrition-allergens"><strong>Listed allergens:</strong> {food.allergens.join(', ')}</p>}
        <div className="nutrition-source"><a href={food.sourceUrl} target="_blank" rel="noreferrer">{food.source}<FiArrowRight/></a><span>{food.attribution}</span></div>
      </> : <>
        <div className="nutrition-modes" role="group" aria-label="Nutrition lookup source"><button aria-pressed={mode==='search'} onClick={()=>changeMode('search')}><FiSearch/>Food search</button><button aria-pressed={mode==='barcode'} onClick={()=>changeMode('barcode')}><FiHash/>Barcode</button></div>
        <form className="nutrition-search-form" onSubmit={submit}><label htmlFor="nutrition-query">{mode==='search'?'Find a matching food':'Product barcode'}</label><div><input id="nutrition-query" value={mode==='search'?query:barcode} onChange={event=>mode==='search'?setQuery(event.target.value):setBarcode(event.target.value.replace(/\D/g,''))} inputMode={mode==='barcode'?'numeric':'text'} maxLength={mode==='barcode'?14:100} placeholder={mode==='search'?'e.g. banana, raw':'Enter 8–14 digits'}/><button className="inventory-button primary" disabled={loading||(mode==='search'?query.trim().length<2:!/^\d{8,14}$/.test(barcode))}><FiSearch/>{mode==='search'?'Search':'Look up'}</button></div><span>{mode==='search'?'USDA FoodData Central':'Open Food Facts'}</span></form>
        {loading ? <div className="nutrition-loading" role="status"><span/>Loading nutrition…</div> : mode==='search' && <div className="nutrition-matches">{foods.length>0&&<p>Choose the food that matches your item.</p>}{foods.map(candidate=><button key={candidate.id} onClick={()=>load(`/usda/${candidate.id}`,{},'food')}><span><strong>{candidate.name}</strong><small>{candidate.type}</small></span><FiArrowRight/></button>)}{searched&&!foods.length&&!error&&<p>No matches found. Try another food name.</p>}</div>}
      </>}
      {error&&<div className="nutrition-error" role="alert">{error}</div>}
    </div>
    <footer className="nutrition-footer"><button className="inventory-button secondary" onClick={onClose}>Close</button></footer>
  </Modal>;
}
