import { useEffect, useState } from 'react';
import Modal from 'react-modal';
import CreatableSelect from 'react-select/creatable';
import { FiCheck, FiPlus, FiX } from 'react-icons/fi';
import { getFoodOptions } from '../../utils/inventory';
const options = getFoodOptions();

export default function AddEditItemModal({prevItem,isEdit,addItemToStore,isOpen,closeModal}) {
  const [name,setName] = useState('');
  const [quantity,setQuantity] = useState(1);
  const [date,setDate] = useState('');
  useEffect(() => {
    if (isOpen) { setName(prevItem?.name || '');setQuantity(prevItem?.quantity ?? 1);setDate(prevItem?.expiresAt?.slice(0,10) || ''); }
  },[isOpen,prevItem]);
  const valid = name.trim() && Number.isFinite(Number(quantity)) && Number(quantity) > 0;
  return <Modal isOpen={isOpen} onRequestClose={closeModal} className="inventory-dialog inventory-editor" overlayClassName="inventory-dialog-backdrop" appElement={document.getElementById('root')} contentLabel={isEdit ? 'Edit grocery item' : 'Add grocery item'}>
    <div className="inventory-dialog-heading"><div><h2>{isEdit ? 'Edit item' : 'Add an item'}</h2><p>{isEdit ? 'Update the details, then save your inventory.' : 'Add grocery details to your shared inventory.'}</p></div><button className="inventory-icon-button" onClick={closeModal} aria-label="Close item form"><FiX/></button></div>
    <form onSubmit={event => {event.preventDefault();if(valid) addItemToStore({name:name.trim(),quantity:Number(quantity),expiresAt:date || null,expirySource:date ? 'user' : 'unknown'});}}>
      <label htmlFor="grocery-name">Item name<span>Required</span></label><CreatableSelect inputId="grocery-name" isClearable options={options} placeholder="Search or type an item" value={name ? {value:name,label:name} : null} onChange={value => setName(value?.value || '')} styles={{control:base => ({...base,minHeight:46,borderRadius:8,borderColor:'#ddd',boxShadow:'none'}),menu:base => ({...base,zIndex:5})}}/>
      <div className="inventory-form-grid"><div><label htmlFor="grocery-quantity">Quantity</label><input id="grocery-quantity" type="number" required min="0.01" step="any" value={quantity} onChange={event => setQuantity(event.target.value)}/></div><div><label htmlFor="grocery-expiry">Date from packaging<span>Optional</span></label><input id="grocery-expiry" type="date" value={date} onChange={event => setDate(event.target.value)}/></div></div>
      <p className="inventory-form-note">Use the date on the packaging, or leave it blank. Changes are shared only after you save your inventory.</p><div className="inventory-dialog-actions"><button className="inventory-button secondary" type="button" onClick={closeModal}>Cancel</button><button className="inventory-button primary" type="submit" disabled={!valid}>{isEdit ? <FiCheck/> : <FiPlus/>}{isEdit ? 'Apply changes' : 'Add item'}</button></div>
    </form>
  </Modal>;
}
