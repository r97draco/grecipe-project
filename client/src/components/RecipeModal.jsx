import { useState } from 'react';
import Modal from 'react-modal';
import { FiArrowRight, FiCheck, FiShoppingBag, FiX } from 'react-icons/fi';
import '../css/RecipeModal.css';

function IngredientList({title,items=[],type}) {
  return <section className={`recipe-detail-list ${type}`}><h3>{type==='have'?<FiCheck/>:<FiShoppingBag/>}{title}<span>{items.length}</span></h3>{items.length ? <ul>{items.map((item,index)=><li key={`${item.id || item.name}-${index}`}><span className="recipe-ingredient-dot"/>{item.original || item.name}</li>)}</ul> : <p>{type==='have' ? 'No matching ingredients listed.' : 'You have all the listed ingredients.'}</p>}</section>;
}
export default function RecipeModal({recipe}) {
  const [open,setOpen]=useState(false);
  return <><button className="recipe-button secondary recipe-view-button" onClick={()=>setOpen(true)}>View ingredients<FiArrowRight/></button><Modal isOpen={open} onRequestClose={()=>setOpen(false)} appElement={document.getElementById('root')} className="recipe-detail-dialog" overlayClassName="recipe-detail-overlay" contentLabel={`Ingredients for ${recipe.title}`}>
    <header className="recipe-detail-heading"><div><span>INGREDIENT CHECKLIST</span><h2>{recipe.title}</h2></div><button onClick={()=>setOpen(false)} aria-label="Close recipe details"><FiX/></button></header>
    <div className="recipe-detail-body">{recipe.image && <img className="recipe-detail-image" src={recipe.image} alt=""/>}<div className="recipe-detail-lists"><IngredientList title="Ingredients you have" items={recipe.usedIngredients || []} type="have"/><IngredientList title="What you still need" items={recipe.missedIngredients || []} type="need"/></div>{recipe.unusedIngredients?.length>0 && <details className="recipe-unused"><summary>Other ingredients you provided ({recipe.unusedIngredients.length})</summary><ul>{recipe.unusedIngredients.map((item,index)=><li key={index}>{item.original || item.name}</li>)}</ul></details>}</div>
    <footer className="recipe-detail-footer"><p>Ingredient matches are based on your selected groceries.</p><button className="recipe-button primary" onClick={()=>setOpen(false)}>Done<FiCheck/></button></footer>
  </Modal></>;
}
