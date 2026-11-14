import { useContext, useEffect, useRef, useState } from 'react';
import { FiActivity, FiCheck, FiClock, FiEdit2, FiX } from 'react-icons/fi';
import Modal from 'react-modal';
import { UserContext } from '../context/Session';
import { backendUrl } from '../config/api';
import api, { isCanceled } from '../utils/authenticatedApi';
import ExerciseTracker from '../components/health/ExerciseTracker';
import Footer from '../components/Footer';
import '../css/Health.css';

const emptyProfile={age:null,gender:'',weight:null,height:null,goal:null,targetReps:10};
export default function Health() {
  const {user,signIn,authBusy,startDemo}=useContext(UserContext);
  const [profile,setProfile]=useState(emptyProfile), [sessions,setSessions]=useState([]);
  const [draft,setDraft]=useState(emptyProfile), [editing,setEditing]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [loading,setLoading]=useState(false), [saving,setSaving]=useState(false), [error,setError]=useState('');
  const active=useRef(true), lock=useRef(false);
  useEffect(()=>{
    active.current=true;
    const controller=new AbortController();
    if(user._id){setLoading(true);api.get(`${backendUrl}/api/health`,{signal:controller.signal}).then(({data})=>{
      if(!controller.signal.aborted){setProfile({...emptyProfile,...data.profile});setSessions(data.sessions);}
    }).catch(failure=>{if(!isCanceled(failure)&&!controller.signal.aborted)setError('Couldn’t load your health details. Refresh to try again.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});}
    return()=>{active.current=false;controller.abort();};
  },[user._id]);
  const saveProfile=async event=>{
    event.preventDefault();if(lock.current)return;
    lock.current=true;setSaving(true);setError('');
    try{
      const {data}=await api.put(`${backendUrl}/api/health`,draft);
      if(active.current){setProfile(data);setEditing(false);}
    }catch(failure){if(active.current&&!isCanceled(failure))setError(failure.response?.data?.message||'Couldn’t save your details. Please try again.');}
    finally{lock.current=false;if(active.current)setSaving(false);}
  };
  const saveSession=async data=>{
    try{
      const response=await api.post(`${backendUrl}/api/health/sessions`,data);
      if(active.current)setSessions(previous=>[response.data,...previous].slice(0,10));
      return true;
    }catch(failure){return failure.response?.status===409;}
  };
  return <><section className="health-page"><div className="health-shell">
    <header className="health-page-heading"><h1>Health</h1></header>
    {!user._id?<div className="health-card health-signin"><FiActivity/><h2>Make room for movement</h2><p>Set your goals and track bicep curls with your camera.</p><div><button className="health-button primary" onClick={signIn} disabled={authBusy}>Sign in with Google</button><button className="health-button secondary" onClick={startDemo}>Try the demo</button></div></div>:loading?<div className="health-card" role="status">Loading your health details…</div>:<>
      {error&&!editing&&<p className="health-alert" role="alert">{error}</p>}
      <section className="health-overview" aria-label="Health profile and goals"><dl>{[['Age',profile.age,'years'],['Height',profile.height,'cm'],['Weight',profile.weight,'kg'],['Goal weight',profile.goal,'kg'],['Session goal',profile.targetReps,'reps']].map(([label,value,unit])=><div key={label}><dt>{label}</dt><dd>{value??'—'}{value&&<small>{unit}</small>}</dd></div>)}</dl><div className="health-overview-actions"><button className="health-text-button" onClick={()=>{setDraft({...profile});setError('');setEditing(true);}}><FiEdit2/>Edit</button><button className="health-text-button" onClick={()=>setHistoryOpen(true)}><FiClock/>History</button></div></section>
      <ExerciseTracker target={profile.targetReps} onSave={saveSession}/>
    </>}
  </div></section><Footer/>
  <Modal isOpen={historyOpen} onRequestClose={()=>setHistoryOpen(false)} appElement={document.getElementById('root')} className="health-edit-modal health-history" overlayClassName="inventory-dialog-backdrop" contentLabel="Recent exercise sessions"><div className="health-card-heading"><h2>Recent sessions</h2><button className="health-close" onClick={()=>setHistoryOpen(false)} aria-label="Close session history"><FiX/></button></div>{sessions.length?<ul>{sessions.map(session=><li key={session.id}><span className="health-session-icon"><FiCheck/></span><div><strong>{session.reps} bicep curls</strong><span>{new Date(session.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {session.arm==='both'?`${session.leftReps} left · ${session.rightReps} right`:`${session.arm} arm`} · {Math.floor(session.seconds/60)}m {session.seconds%60}s</span></div></li>)}</ul>:<p>Your saved sessions will appear here.</p>}</Modal>
  <Modal isOpen={editing} onRequestClose={()=>{if(!saving)setEditing(false);}} appElement={document.getElementById('root')} className="health-edit-modal" overlayClassName="inventory-dialog-backdrop" contentLabel="Edit health details"><form onSubmit={saveProfile}><div className="health-card-heading"><h2>Edit details</h2><button type="button" className="health-close" onClick={()=>setEditing(false)} disabled={saving} aria-label="Close health details"><FiX/></button></div><div className="health-edit-grid">{[['age','Age','years',1,120],['height','Height','cm',1,300],['weight','Weight','kg',1,500],['goal','Goal weight','kg',1,500],['targetReps','Session goal','reps',1,200]].map(([key,label,unit,min,max])=><label key={key} htmlFor={`health-${key}`}>{label} <span>({unit})</span><input id={`health-${key}`} type="number" min={min} max={max} step={key==='weight'||key==='goal'||key==='height'?'.1':'1'} value={draft[key]??''} required={key==='targetReps'} onChange={event=>setDraft({...draft,[key]:event.target.value===''?null:Number(event.target.value)})}/></label>)}<label htmlFor="health-gender">Gender<select id="health-gender" value={draft.gender||''} onChange={event=>setDraft({...draft,gender:event.target.value})}><option value="">Not set</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer-not-to-say">Prefer not to say</option></select></label></div>{error&&<p className="health-alert" role="alert">{error}</p>}<div className="health-edit-actions"><button type="button" className="health-button secondary" onClick={()=>setEditing(false)} disabled={saving}>Cancel</button><button className="health-button primary" disabled={saving}>{saving?'Saving…':'Save details'}</button></div></form></Modal></>;
}
