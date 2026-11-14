import { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import { FiCheck, FiUpload, FiX } from 'react-icons/fi';
import customFetch from '../../utils/fetchWrapper';
import { notify } from '../../utils/notifications';
import '../../css/ReceiptReview.css';
import { isCanceled } from '../../utils/authenticatedApi';
import usePageScope from '../../hooks/usePageScope';
import { getDemoProfile } from '../../demo/demoSession';
import { defaultExpiryDate } from '../../utils/inventoryDates';

export default function UploadReceipt({updateInventory,disabled=false}) {
  const [loading,setLoading]=useState(false);
  const [review,setReview]=useState(null);
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState('');
  const demo=!!getDemoProfile();
  const input=useRef(null);
  const isActive=usePageScope();
  const uploadLock=useRef(false);
  useEffect(()=>{
    if(!file) {setPreview('');return;}
    const url=URL.createObjectURL(file);setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);
  const upload=async event=>{
    const selected=event.target.files?.[0];event.target.value='';
    if(!selected || uploadLock.current)return;
    if(!['image/jpeg','image/png'].includes(selected.type)){notify('Choose a JPG or PNG receipt image.','error');return;}
    if(selected.size>10*1024*1024){notify('Choose an image smaller than 10 MB.','error');return;}
    uploadLock.current=true;setFile(selected);setLoading(true);
    const data=new FormData();data.append('receipt',selected);
    try{
      const response=await customFetch('/item/upload',{method:'POST',body:data,timeout:120000});
      if(!isActive())return;
      const rows=response.items || [];
      if(!rows.length){notify('No grocery items found. Try a clearer photo or add items manually.','info');setFile(null);return;}
      setReview(rows.map(item=>({...item,id:crypto.randomUUID(),include:true,expiresAt:item.expiresAt?.slice(0,10) || defaultExpiryDate()})));
    }catch(error){if(!isActive() || isCanceled(error))return;notify(error.response?.data?.message || 'Couldn’t read your receipt. Try a clear, straight photo with the entire receipt visible.','error');setFile(null);}
    finally{uploadLock.current=false;if(isActive())setLoading(false);}
  };
  const sampleReceipt=async()=>{
    if(uploadLock.current)return;
    uploadLock.current=true;setLoading(true);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="420"><rect width="400" height="420" fill="white"/><g font-family="monospace" fill="black" font-size="19"><text x="30" y="50">Grecipe Demo Market</text><text x="30" y="110">2 x BANANAS    2.99</text><text x="30" y="155">MILK           3.49</text><text x="30" y="200">BREAD          2.79</text><text x="30" y="275">TOTAL          9.27</text><text x="30" y="350">SAMPLE RECEIPT</text></g></svg>';
    setFile(new File([svg],'demo-receipt.svg',{type:'image/svg+xml'}));
    try{
      const response=await customFetch('/item/upload',{method:'POST'});
      if(isActive())setReview(response.items.map(item=>({...item,id:crypto.randomUUID(),include:true})));
    }catch(error){if(isActive()&&!isCanceled(error))notify('Couldn’t load the sample receipt.','error');}
    finally{uploadLock.current=false;if(isActive())setLoading(false);}
  };
  const close=()=>{setReview(null);setFile(null);};
  const update=(id,field,value)=>setReview(rows=>rows.map(row=>row.id===id?{...row,[field]:value}:row));
  const selected=review?.filter(row=>row.include) || [];
  const valid=selected.length>0 && selected.every(row=>row.name.trim() && Number.isFinite(Number(row.quantity)) && Number(row.quantity)>0);
  const confirm=()=>{
    if(!valid)return;
    updateInventory(selected.map(row=>({name:row.name.trim(),quantity:Number(row.quantity),expiresAt:row.expiresAt || null,expirySource:row.expiresAt?'user':'unknown',fooDBKey:row.fooDBKey})));
    close();
  };
  return <>
    <button className="inventory-button secondary" onClick={()=>demo?sampleReceipt():input.current?.click()} disabled={disabled || loading}><FiUpload/>{loading?'Reading receipt…':demo?'Sample receipt':'Upload receipt'}</button>
    <input ref={input} type="file" accept="image/jpeg,image/png" hidden aria-label="Receipt image" onChange={upload} disabled={disabled || loading}/>
    <Modal isOpen={!!review} onRequestClose={close} className="receipt-review" overlayClassName="inventory-dialog-backdrop" appElement={document.getElementById('root')} contentLabel="Review scanned receipt">
      <header className="receipt-review-heading"><div><h2>Scanned items</h2><p>Edit items before adding.</p></div><button className="inventory-icon-button" onClick={close} aria-label="Close receipt review"><FiX/></button></header>
      <div className="receipt-review-body">
        <div className="receipt-review-summary">{preview&&<a href={preview} target="_blank" rel="noreferrer" aria-label="Open original receipt image"><img src={preview} alt="Uploaded receipt"/></a>}<div><strong>{file?.name}</strong><p>Default expiry: two weeks. You can change any date.</p></div></div>
        <div className="receipt-select-all"><label><input type="checkbox" checked={!!review?.length&&selected.length===review.length} onChange={event=>setReview(rows=>rows.map(row=>({...row,include:event.target.checked})))}/>Select all items</label><span>{selected.length} selected</span></div>
        <div className="receipt-column-labels" aria-hidden="true"><span/><span>Item name / receipt line</span><span>Quantity</span><span>Expiry date</span></div>
        <div className="receipt-review-items">{review?.map(row=><div className={`receipt-review-row ${row.include?'':'excluded'}`} key={row.id}>
          <input className="receipt-include" type="checkbox" checked={row.include} onChange={event=>update(row.id,'include',event.target.checked)} aria-label={`Include ${row.name}`}/>
          <div className="receipt-product"><input aria-label={`Item name for ${row.sourceLine}`} value={row.name} disabled={!row.include} onChange={event=>update(row.id,'name',event.target.value)} maxLength={150}/><details className="receipt-original"><summary>Receipt text</summary>{row.sourceLine}</details></div>
          <div className="receipt-quantity"><label htmlFor={`qty-${row.id}`}>Quantity</label><input id={`qty-${row.id}`} type="number" min="0.01" step="any" value={row.quantity} disabled={!row.include} onChange={event=>update(row.id,'quantity',event.target.value)}/></div>
          <div className="receipt-date"><label htmlFor={`date-${row.id}`}>Expiry date</label><input id={`date-${row.id}`} type="date" value={row.expiresAt} disabled={!row.include} onChange={event=>update(row.id,'expiresAt',event.target.value)}/></div>
        </div>)}</div>
      </div>
      <footer className="receipt-review-footer"><div><button className="inventory-button secondary" onClick={close}>Cancel</button><button className="inventory-button primary" onClick={confirm} disabled={!valid}><FiCheck/>Add {selected.length} {selected.length===1?'item':'items'}</button></div></footer>
    </Modal>
  </>;
}
