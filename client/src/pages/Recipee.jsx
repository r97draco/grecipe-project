import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiCheckCircle, FiGrid, FiList, FiPackage, FiSearch, FiShoppingBag, FiX } from 'react-icons/fi';
import RecipeModal from '../components/RecipeModal';
import api from '../utils/authenticatedApi';
import { UserContext, backendUrl } from '../App';
import Footer from '../components/Footer';
import '../css/Recipe.css';

const missing = recipe => recipe.missedIngredientCount ?? recipe.missedIngredients?.length ?? 0;
const matched = recipe => recipe.usedIngredientCount ?? recipe.usedIngredients?.length ?? 0;

export default function Recipee() {
  const {user} = useContext(UserContext);
  const [mode,setMode] = useState('ingredients');
  const [ingredients,setIngredients] = useState('');
  const [recipes,setRecipes] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [searched,setSearched] = useState(false);
  const [source,setSource] = useState('');
  const [search,setSearch] = useState('');
  const [sort,setSort] = useState('missing');
  const [readyOnly,setReadyOnly] = useState(false);
  const [inventory,setInventory] = useState([]);
  const [inventoryLoading,setInventoryLoading] = useState(false);
  const [inventoryError,setInventoryError] = useState(false);
  const [revision,setRevision] = useState(0);
  const parsed = [...new Set(ingredients.split(',').map(value => value.trim()).filter(Boolean))];

  useEffect(() => {
    setRecipes([]);setSearched(false);setError('');setSource('');
  },[user._id,user.family]);
  useEffect(() => {
    let active = true;
    setInventory([]);setInventoryError(false);setInventoryLoading(false);
    if (mode !== 'inventory' || !user._id || !user.family) return;
    setInventoryLoading(true);
    api.get(`${backendUrl}/api/item/family`,{params:{familyId:user.family}}).then(response => {
      if(active) setInventory(response.data);
    }).catch(() => {if(active) setInventoryError(true);})
      .finally(() => {if(active) setInventoryLoading(false);});
    return () => {active=false;};
  },[mode,user._id,user.family,revision]);

  const generate = async event => {
    event.preventDefault();
    if(loading || !user._id) return;
    setLoading(true);setError('');
    try {
      const response = mode === 'inventory'
        ? await api.get(`${backendUrl}/api/recipe/${user.email}`)
        : await api.post(`${backendUrl}/api/recipe/${user.email}`,{ingredients:parsed});
      setRecipes(Array.isArray(response.data.recipes) ? response.data.recipes : []);
      setSearched(true);setSource(mode === 'inventory' ? 'Your family inventory' : parsed.join(', '));setSearch('');setReadyOnly(false);
    } catch(error) {
      setError(error.response?.status === 401 ? 'Please sign in again to find recipes.' : error.response?.data?.message || 'Couldn’t find recipes right now. Please try again.');
    } finally {setLoading(false);}
  };
  const filtered = recipes.filter(recipe => recipe.title.toLowerCase().includes(search.toLowerCase()) && (!readyOnly || missing(recipe) === 0))
    .sort((a,b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'matched' ? matched(b)-matched(a) : missing(a)-missing(b));
  const readyCount = recipes.filter(recipe => missing(recipe) === 0).length;
  const disabled = loading || (mode === 'ingredients' ? !parsed.length : !user.family || inventoryLoading || inventoryError || !inventory.length);

  return <>
    <section className="recipe-page main-bg"><div className="recipe-shell">
      <header className="recipe-heading"><h1>Recipe</h1><p>Find something to cook with the ingredients you already have.</p></header>
      {!user._id ? <section className="recipe-panel recipe-empty"><span className="recipe-empty-icon"><FiShoppingBag/></span><h2>Turn your groceries into a meal</h2><p>Sign in to find recipes from your family inventory or your own ingredients.</p><Link className="recipe-button primary" to="/family">Get started<FiArrowRight/></Link></section> : <>
        <section className="recipe-panel recipe-finder"><div className="recipe-panel-heading"><div><h2>What are you cooking with?</h2><p>Choose one source for your ingredients.</p></div></div>
          <div className="recipe-source-tabs" role="group" aria-label="Recipe ingredient source"><button aria-pressed={mode === 'ingredients'} onClick={() => setMode('ingredients')} disabled={loading}><FiList/><span>My ingredients<small>Enter what you have</small></span></button><button aria-pressed={mode === 'inventory'} onClick={() => setMode('inventory')} disabled={loading}><FiPackage/><span>Family inventory<small>Use your saved groceries</small></span></button></div>
          <form onSubmit={generate}>
            {mode === 'ingredients' ? <div className="recipe-input-area"><label htmlFor="recipe-ingredients">Ingredients<span>Separate each item with a comma</span></label><textarea id="recipe-ingredients" value={ingredients} onChange={event => setIngredients(event.target.value)} placeholder="e.g. potatoes, onions, eggs" rows={3} disabled={loading}/><span className="recipe-input-hint">{parsed.length ? `${parsed.length} ${parsed.length === 1 ? 'ingredient' : 'ingredients'} added` : 'Add at least one ingredient to get started.'}</span></div> : <div className="recipe-inventory-area">{!user.family ? <div className="recipe-source-empty"><FiPackage/><div><strong>Set up your family inventory</strong><p>Create or join a family, then add your groceries.</p></div><Link className="recipe-button secondary" to="/family">Go to Family<FiArrowRight/></Link></div> : inventoryLoading ? <p className="recipe-source-message" role="status">Loading your saved groceries…</p> : inventoryError ? <div className="recipe-source-empty"><p>Couldn’t load your inventory.</p><button type="button" className="recipe-button secondary" onClick={() => setRevision(value=>value+1)}>Try again</button></div> : !inventory.length ? <div className="recipe-source-empty"><FiPackage/><div><strong>Your inventory is empty</strong><p>Add groceries and save them before finding recipes.</p></div><Link className="recipe-button secondary" to="/inventory">Add groceries<FiArrowRight/></Link></div> : <><div className="recipe-inventory-label"><strong>{inventory.length} saved {inventory.length === 1 ? 'item' : 'items'}</strong><Link to="/inventory">Manage inventory<FiArrowRight/></Link></div><div className="recipe-ingredient-chips">{inventory.slice(0,12).map(item=><span key={item._id}>{item.name}</span>)}{inventory.length>12&&<span>+{inventory.length-12} more</span>}</div></>}</div>}
            <div className="recipe-generate-row"><span><FiSearch/>We’ll show what you have and what you still need.</span><button type="submit" className="recipe-button primary" disabled={disabled}>{loading ? <><span className="recipe-spinner"/>Finding recipes…</> : <><FiSearch/>Find recipes</>}</button></div>
          </form>
          {error && <div className="recipe-error" role="alert"><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss recipe error"><FiX/></button></div>}
        </section>
        <section className="recipe-results" aria-live="polite" aria-busy={loading}>
          <div className="recipe-results-heading"><div><h2>{searched ? 'Your recipe matches' : 'Recipe ideas'}</h2><p>{loading ? 'Looking for meals that fit your ingredients…' : searched ? `${recipes.length} ${recipes.length===1?'recipe':'recipes'} found · ${source}` : 'Your results will appear here after you find recipes.'}</p></div>{searched && !loading && <span className="recipe-result-count">{recipes.length} results</span>}</div>
          {searched && !!recipes.length && !loading && <div className="recipe-results-tools"><label className="recipe-result-search"><FiSearch/><input aria-label="Search recipe results" placeholder="Search recipes" value={search} onChange={event=>setSearch(event.target.value)}/></label><label className="recipe-ready-filter"><input type="checkbox" checked={readyOnly} onChange={event=>setReadyOnly(event.target.checked)}/>No extra ingredients<span>{readyCount}</span></label><label className="recipe-sort">Sort by<select value={sort} onChange={event=>setSort(event.target.value)}><option value="missing">Fewest missing</option><option value="matched">Most ingredients used</option><option value="name">Name: A–Z</option></select></label></div>}
          {loading ? <div className="recipe-results-empty" role="status"><span className="recipe-spinner"/><h3>Finding your next meal</h3><p>This may take a moment.</p></div> : !filtered.length ? <div className="recipe-results-empty"><FiGrid/><h3>{!searched ? 'Start with what you have' : !recipes.length ? 'No matches this time' : 'No recipes match these filters'}</h3><p>{!searched ? 'Choose your ingredients above, then select Find recipes.' : !recipes.length ? 'Try a different combination of ingredients.' : 'Try a different search or include recipes that need extra ingredients.'}</p>{recipes.length>0 && <button className="recipe-button secondary" onClick={()=>{setSearch('');setReadyOnly(false);}}>Show all recipes</button>}</div> : <div className="recipe-results-grid">{filtered.map(recipe => <article className="recipe-result-card" key={recipe.id}><div className="recipe-card-image">{recipe.image ? <img src={recipe.image} alt="" loading="lazy" onError={event=>{event.currentTarget.style.display='none';}}/> : <FiShoppingBag/>}{missing(recipe)===0 && <span className="recipe-ready-badge"><FiCheckCircle/>No extras needed</span>}</div><div className="recipe-card-content"><h3>{recipe.title}</h3><div className="recipe-match-counts"><span><FiCheck/>{matched(recipe)} you have</span><span><FiShoppingBag/>{missing(recipe)} more needed</span></div><RecipeModal recipe={recipe}/></div></article>)}</div>}
        </section>
      </>}
    </div></section><Footer/>
  </>;
}
