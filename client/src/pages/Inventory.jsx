import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from 'react-modal';
import { FiArrowRight, FiBarChart2, FiCheck, FiClock, FiEdit2, FiPackage, FiPlus, FiSave, FiSearch, FiTrash2, FiUsers, FiX } from 'react-icons/fi';
import UploadReceipt from '../components/inventory/UploadReceipt';
import AddEditItemModal from '../components/inventory/AddEditItemModal';
import NutritionModal from '../components/inventory/NutritionModal';
import { UserContext, backendUrl } from '../App';
import api, { isCanceled } from '../utils/authenticatedApi';
import usePageScope from '../hooks/usePageScope';
import { notify } from '../utils/notifications';
import Footer from '../components/Footer';
import '../css/Inventory.css';

function expiration(item) {
  if (!item.expiresAt) return {days:Infinity,label:'',date:'Not set'};
  const raw = item.expiresAt.slice(0,10);
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return {days:Infinity,label:'No date set',date:'—'};
  const today = new Date(); today.setHours(0,0,0,0);
  const days = Math.round((date - today) / 86400000);
  return { days, date:date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}), label:days < 0 ? 'Past date' : days === 0 ? 'Date is today' : days <= 3 ? `In ${days} ${days === 1 ? 'day' : 'days'}` : '' };
}
const keyOf = item => item._id || item._localId;
const pending = item => item.isLocal || item.isEdited;

export default function Inventory() {
  const { user } = useContext(UserContext);
  const isActive = usePageScope();
  const mutationLock = useRef(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [nutritionItem,setNutritionItem] = useState(null);
  const [nutritionResults,setNutritionResults] = useState({});
  const dirtyCount = items.filter(pending).length;
  const useSoonCount = items.filter(item => expiration(item).days <= 3).length;

  useEffect(() => {
    let active = true;
    setItems([]); setError('');
    if (!user._id || !user.family) { setLoading(false); return; }
    setLoading(true);
    api.get(`${backendUrl}/api/item/family`,{params:{familyId:user.family},cache:revision === 0}).then(response => {
      if (active) setItems(Array.isArray(response.data) ? response.data : []);
    }).catch(error => { if (active && !isCanceled(error)) setError(error.response?.status === 401 ? 'Please sign in again to load your inventory.' : 'Couldn’t load your groceries. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user._id,user.family,revision]);

  useEffect(() => {
    if (!dirtyCount) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  }, [dirtyCount]);

  const addItems = incoming => {
    if (!incoming.length) { notify('No grocery items found. Try adding an item manually.','info'); return; }
    setItems(current => [...current,...incoming.map(item => ({...item,_localId:crypto.randomUUID(),isLocal:true}))]);
    notify(`${incoming.length} ${incoming.length === 1 ? 'item added' : 'items added'}. Review and save your changes.`,'info');
  };
  const submitItem = values => {
    if (editing && values.name !== editing.name) setNutritionResults(current => {
      const next={...current};delete next[keyOf(editing)];return next;
    });
    if (editing) setItems(current => current.map(item => keyOf(item) === keyOf(editing) ? {...item,...values,isEdited:!item.isLocal} : item));
    else addItems([values]);
    setEditorOpen(false); setEditing(null);
  };
  const save = async () => {
    if (mutationLock.current || !dirtyCount) return;
    mutationLock.current=true;
    setSaving(true); setError('');
    try {
      const additions = items.filter(item => item.isLocal);
      if (additions.length) {
        const response = await api.post(`${backendUrl}/api/item/add`,{items:additions.map(({name,quantity,expiresAt,fooDBKey,expirySource}) => ({name,quantity,expiresAt:expiresAt || null,fooDBKey,expirySource}))},{params:{email:user.email}});
        if (!isActive()) return;
        const saved = new Map(additions.map((item,index) => [keyOf(item),response.data[index]]));
        setNutritionResults(current => {
          const next={...current};
          additions.forEach((item,index) => {if(next[keyOf(item)]) {next[response.data[index]._id]=next[keyOf(item)];delete next[keyOf(item)];}});
          return next;
        });
        setItems(current => current.map(item => saved.has(keyOf(item)) ? saved.get(keyOf(item)) : item));
      }
      for (const item of items.filter(item => item.isEdited && !item.isLocal)) {
        if (!isActive()) return;
        const { name,quantity,expiresAt,expirySource } = item;
        const response = await api.put(`${backendUrl}/api/item/update/${item._id}`,{name,quantity,expiresAt:expiresAt || null,expirySource});
        if (!isActive()) return;
        setItems(current => current.map(row => row._id === item._id ? response.data : row));
      }
      if (!isActive()) return;
      notify('Inventory saved. Your family can see the updates.','success');
    } catch (error) { if (isActive() && !isCanceled(error)) setError(error.response?.status === 401 ? 'Please sign in again before saving.' : 'Some changes couldn’t be saved. Your remaining edits are still here; try saving again.'); }
    finally { mutationLock.current=false; if(isActive()) setSaving(false); }
  };
  const deleteItem = async () => {
    if (mutationLock.current) return;
    mutationLock.current=true;
    setDeleteBusy(true);
    try {
      if (!deleting.isLocal) await api.delete(`${backendUrl}/api/item/delete/${deleting._id}`);
      if (!isActive()) return;
      setItems(current => current.filter(item => keyOf(item) !== keyOf(deleting)));
      setDeleting(null); notify('Item removed.','success');
    } catch (error) { if(isActive() && !isCanceled(error)) notify('Couldn’t remove the item. Please try again.','error'); }
    finally { mutationLock.current=false; if(isActive()) setDeleteBusy(false); }
  };
  const visible = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'soon' ? expiration(item).days <= 3 : pending(item))))
    .sort((a,b) => sort === 'expiry' ? expiration(a).days - expiration(b).days : sort === 'quantity' ? (b.quantity || 0) - (a.quantity || 0) : sort === 'name-desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));

  return <>
    <section className="inventory-page main-bg"><div className="inventory-shell">
      <header className="inventory-heading"><h1>Inventory</h1><p>Keep track of your groceries and use what you have.</p></header>
      {!user._id ? <section className="inventory-card inventory-empty"><span className="inventory-empty-icon"><FiPackage/></span><h2>Your shared pantry</h2><p>Please sign in using Join to manage your family and groceries.</p><Link className="inventory-button primary" to="/family">Get started<FiArrowRight/></Link></section> : !user.family ? <section className="inventory-card inventory-empty"><span className="inventory-empty-icon"><FiUsers/></span><h2>Set up your shared inventory</h2><p>Create or join a family to keep your groceries in one place.</p><Link className="inventory-button primary" to="/family">Go to Family<FiArrowRight/></Link></section> : <>
        <div className="inventory-context"><span><FiUsers/>Shared with your family</span><Link to="/family">Manage family<FiArrowRight/></Link></div>
        <div className="inventory-stats" aria-label="Inventory overview"><div><FiPackage/><span><strong>{loading ? '—' : items.length}</strong>Total items</span></div><div className={useSoonCount ? 'needs-attention' : ''}><FiClock/><span><strong>{loading ? '—' : useSoonCount}</strong>Use soon / past date</span></div><div><FiSave/><span><strong>{dirtyCount}</strong>Unsaved changes</span></div></div>
        {error && <div className="inventory-alert" role="alert"><span>{error}</span>{!dirtyCount && <button onClick={() => setRevision(value => value+1)}>Try again</button>}</div>}
        <section className="inventory-card inventory-list-card">
          <div className="inventory-card-heading"><div><h2>Your groceries</h2></div><div className="inventory-add-actions"><UploadReceipt updateInventory={addItems} disabled={saving || loading}/><button className={`inventory-button ${dirtyCount ? 'secondary' : 'primary'}`} onClick={() => {setEditing(null);setEditorOpen(true);}} disabled={saving || loading}><FiPlus/>Add item</button></div></div>
          <div className="inventory-tools"><label className="inventory-search"><FiSearch/><input aria-label="Search groceries" placeholder="Search items" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><FiX/></button>}</label><label className="inventory-sort">Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="name">Name: A–Z</option><option value="name-desc">Name: Z–A</option><option value="expiry">Expiry: soonest</option><option value="quantity">Quantity: highest</option></select></label></div>
          <div className="inventory-list-tabs" aria-label="Filter groceries">{[['all','All items',items.length],['soon','Use soon',useSoonCount],['pending','Unsaved',dirtyCount]].map(([value,label,count]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}</div>
          {dirtyCount > 0 && <div className="inventory-save-bar" role="status"><span><FiSave/><strong>{dirtyCount} {dirtyCount === 1 ? 'change' : 'changes'} to save</strong></span><button className="inventory-button primary" onClick={save} disabled={saving || deleteBusy}><FiCheck/>{saving ? 'Saving…' : 'Save changes'}</button></div>}
          {loading ? <div className="inventory-empty" role="status">Loading your groceries…</div> : !visible.length ? <div className="inventory-empty"><span className="inventory-empty-icon">{items.length ? <FiSearch/> : <FiPackage/>}</span><h3>{items.length ? 'No items to show' : 'Your pantry is ready to fill'}</h3><p>{items.length ? 'Try a different search or choose another filter.' : 'Use Add item or Upload receipt above to get started.'}</p>{items.length > 0 && <button className="inventory-button secondary" onClick={() => {setSearch('');setFilter('all');}}>Show all items</button>}</div> : <div className="inventory-table"><div className="inventory-columns" aria-hidden="true"><span>Item</span><span>Quantity</span><span>Expiry date</span><span>Actions</span></div><ul>{visible.map(item => { const expiry = expiration(item); return <li className="inventory-row" key={keyOf(item)}><div className="inventory-item-name"><strong>{item.name}</strong>{pending(item) && <span className="inventory-draft">{item.isLocal ? 'New · unsaved' : 'Edited · unsaved'}</span>}</div><div className="inventory-quantity"><span className="inventory-mobile-label">Qty</span>{item.quantity ?? '—'}</div><div className="inventory-expiry"><span>{expiry.date}</span>{expiry.label && <small className={expiry.days < 0 ? 'expired' : expiry.days <= 3 ? 'soon' : ''}>{expiry.label}</small>}</div><div className="inventory-row-actions"><button className="inventory-icon-button nutrition" aria-label={`Nutrition for ${item.name}`} title="View nutrition" disabled={saving || deleteBusy} onClick={() => setNutritionItem(item)}><FiBarChart2/><span>Nutrition</span></button><button className="inventory-icon-button" aria-label={`Edit ${item.name}`} title="Edit item" disabled={saving || deleteBusy} onClick={() => {setEditing(item);setEditorOpen(true);}}><FiEdit2/><span>Edit</span></button><button className="inventory-icon-button remove" aria-label={`Remove ${item.name}`} title="Remove item" disabled={saving || deleteBusy} onClick={() => setDeleting(item)}><FiTrash2/><span>Remove</span></button></div></li>; })}</ul></div>}
          <div className="inventory-list-footer"><span>{visible.length} of {items.length} items</span><span>{loading ? 'Loading…' : error ? 'Check the message above' : dirtyCount ? 'Unsaved changes' : <><FiCheck/>All changes saved</>}</span></div>
        </section>
        <div className="inventory-next"><FiPackage/><p>Cook with your groceries.</p><Link to="/recipe">Find recipes<FiArrowRight/></Link></div>
      </>}
    </div></section><Footer/>
    {nutritionItem && <NutritionModal key={keyOf(nutritionItem)} item={nutritionItem} initial={nutritionResults[keyOf(nutritionItem)]} onClose={()=>setNutritionItem(null)} onResult={food=>setNutritionResults(current=>({...current,[keyOf(nutritionItem)]:food}))}/>}
    <AddEditItemModal isOpen={editorOpen} isEdit={!!editing} prevItem={editing} closeModal={() => {setEditorOpen(false);setEditing(null);}} addItemToStore={submitItem}/>
    {deleting && <Modal isOpen onRequestClose={() => { if (!deleteBusy) setDeleting(null); }} appElement={document.getElementById('root')} className="inventory-dialog" overlayClassName="inventory-dialog-backdrop" contentLabel="Remove grocery item"><h2 id="inventory-delete-title">Remove {deleting.name}?</h2><p>{deleting.isLocal ? 'This unsaved item will be discarded.' : 'This item will be removed from your family’s shared inventory.'}</p><div className="inventory-dialog-actions"><button className="inventory-button secondary" autoFocus onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</button><button className="inventory-button danger" onClick={deleteItem} disabled={deleteBusy}><FiTrash2/>{deleteBusy ? 'Removing…' : 'Remove item'}</button></div></Modal>}
  </>;
}
