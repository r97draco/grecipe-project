import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiHome, FiPlus, FiSearch, FiShield, FiUsers, FiX, FiUserPlus, FiLogOut, FiTrash2, FiCopy } from 'react-icons/fi';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase/firebase';
import { UserContext, backendUrl } from '../App';
import api from '../utils/authenticatedApi';
import Footer from '../components/Footer';
import '../css/Family.css';

const initials = name => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();

export default function FamilyPage() {
  const { user, setUser } = useContext(UserContext);
  const [family, setFamily] = useState(null);
  const [families, setFamilies] = useState([]);
  const [name, setName] = useState('');
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [setupMode, setSetupMode] = useState('join');
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingMember, setPendingMember] = useState(null);
  const [revision, setRevision] = useState(0);
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!pendingMember) return;
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const closeOnEscape = event => { if (event.key === 'Escape' && !busy) setPendingMember(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('keydown', closeOnEscape); previous?.focus(); };
  }, [pendingMember, busy]);

  useEffect(() => {
    let active = true;
    setFamily(null); setFamilies([]); setError('');
    if (!user._id) { setLoading(false); return; }
    setLoading(true);
    const path = user.family ? `/api/family/${user.family}` : '/api/family/getallfamilies';
    api.get(`${backendUrl}${path}`).then(response => {
      if (!active) return;
      if (user.family) setFamily(response.data);
      else setFamilies(response.data);
    }).catch(error => {
      if (active) setError(error.response?.status === 401 ? 'Please sign in again to manage your family.' : 'We couldn’t load your family. Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user._id, user.family, revision]);

  const runAction = async (key, action, message) => {
    if (busy) return;
    setBusy(key); setError(''); setNotice('');
    try {
      await action();
      const response = await api.get(`${backendUrl}/api/user/getuser`, { params: { email: user.email } });
      setUser(response.data); setRevision(value => value + 1);
      setPendingMember(null); setName(''); setNotice(message);
    } catch (error) {
      setError(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setBusy(''); }
  };
  const createFamily = event => {
    event.preventDefault();
    if (!user._id || !name.trim()) return;
    runAction('create', () => api.post(`${backendUrl}/api/family/createfamily`, {name:name.trim(), members:[user._id], userId:user._id}), 'Family created successfully.');
  };
  const joinFamily = id => runAction(id, () => api.put(`${backendUrl}/api/family/updatefamily/${id}`, {action:'add',memberId:user._id}), 'You’ve joined the family.');
  const removeMember = () => runAction('remove', () => api.put(`${backendUrl}/api/family/updatefamily/${family._id}`, {action:'remove', memberId:pendingMember._id}), pendingMember._id === user._id ? 'You’ve left the family.' : 'Member removed from the family.');
  const signIn = async () => {
    setBusy('signin'); setError('');
    try { await signInWithPopup(auth, provider); }
    catch { setError('Sign-in didn’t finish. Please try again using Join in the navigation.'); }
    finally { setBusy(''); }
  };
  const copyFamilyLink = async () => {
    try {
      const link = new URL('/family', window.location.origin);
      link.searchParams.set('search', family.name);
      await navigator.clipboard.writeText(link.toString());
      setNotice('Family link copied. Share it with the person you want to join.');
    } catch {
      setError('Couldn’t copy the link. Ask them to open Family and search for your family name.');
    }
  };
  const members = family?.members || [];
  const filteredFamilies = families.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  return <>
    <section className="family-page main-bg">
      <div className="family-shell">
        <header className="family-heading">
          <h1>Family</h1>
          <p>Manage the people you share your groceries with.</p>
        </header>

        {error && <div className="family-alert" role="alert"><span>{error}</span><button onClick={() => setRevision(value => value + 1)} disabled={!!busy}>Try again</button></div>}
        {notice && <div className="family-notice" role="status"><FiCheck/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><FiX/></button></div>}

        {!user._id ? <section className="family-signin family-card">
          <span className="family-icon"><FiUsers/></span>
          <h2>Your shared groceries start here</h2>
          <p>Sign in to create a family or join an existing one.</p>
          <button className="family-button primary" onClick={signIn} disabled={!!busy}>{busy === 'signin' ? 'Opening sign-in…' : 'Sign in with Google'}<FiArrowRight/></button>
        </section> : loading ? <div className="family-loading" role="status">Loading your family…</div> : family ? <>
          <section className="family-summary family-card">
            <span className="family-icon"><FiHome/></span>
            <div className="family-summary-info"><h2>{family.name}</h2><p>{members.length} {members.length === 1 ? 'member' : 'members'}<span>·</span>{user.isFamilyHead ? 'You’re the family head' : 'You’re a member'}</p></div>
            <Link className="family-button secondary" to="/inventory">View inventory<FiArrowRight/></Link>
          </section>

          <section className="family-card family-members-card">
            <div className="family-section-heading"><div><h2>Family members <span className="family-count">{members.length}</span></h2><p>See who’s in your family and manage their access.</p></div><button className="family-button primary" aria-expanded={showAddMembers} onClick={() => setShowAddMembers(value => !value)}><FiUserPlus/>{showAddMembers ? 'Close' : 'Add members'}</button></div>
            {showAddMembers && <div className="family-add-panel"><div><h3>Add someone to {family.name}</h3><p>Share your family link. They’ll sign in, find your family, and choose <strong>Join family</strong>.</p></div><button className="family-button secondary" onClick={copyFamilyLink}><FiCopy/>Copy family link</button></div>}
            <div className="family-table-labels" aria-hidden="true"><span>Member</span><span>Role</span><span>Action</span></div>
            <div className="family-member-list">{members.map(member => <div className="family-member" key={member._id}>
              <div className="family-member-person"><span className="family-member-avatar">{initials(member.userName)}</span>
              <div className="family-member-identity"><strong>{member.userName || 'Family member'}{member._id === user._id && <span className="family-you">You</span>}</strong><span>{member.email}</span></div></div>
              <span className={`family-role ${member.isFamilyHead ? 'role-head' : ''}`}>{member.isFamilyHead && <FiShield/>}{member.isFamilyHead ? 'Family head' : 'Member'}</span>
              <div className="family-member-controls">{user.isFamilyHead && member._id !== user._id ? <button className="family-button remove" aria-label={`Remove ${member.userName || 'member'}`} onClick={() => setPendingMember(member)} disabled={!!busy}><FiTrash2/>Remove</button> : <span className="family-no-action">{member._id === user._id ? 'Your account' : '—'}</span>}</div>
            </div>)}</div>
          </section>
          <section className="family-leave family-card"><div><h2>Leave this family</h2><p>You’ll lose access to its shared inventory. Your account stays active.</p></div><button className="family-button remove" onClick={() => setPendingMember(user)} disabled={!!busy}><FiLogOut/>Leave family</button></section>
        </> : user.family ? <div className="family-card family-empty"><FiUsers/><h2>Family unavailable</h2><p>Try loading your family again using the button above.</p></div> : <div className="family-setup">
          <div className="family-setup-tabs" role="tablist" aria-label="Family setup"><button id="join-family-tab" role="tab" aria-selected={setupMode === 'join'} aria-controls="family-setup-panel" onClick={() => setSetupMode('join')}><FiUsers/>Join a family</button><button id="create-family-tab" role="tab" aria-selected={setupMode === 'create'} aria-controls="family-setup-panel" onClick={() => setSetupMode('create')}><FiPlus/>Create a family</button></div>
          <div id="family-setup-panel" role="tabpanel" aria-labelledby={setupMode === 'join' ? 'join-family-tab' : 'create-family-tab'}>
          {setupMode === 'create' ? <section className="family-card family-create-card">
            <div className="family-section-heading"><span className="family-icon"><FiPlus/></span><div><h2>Create a family</h2><p>Start a shared inventory for your household.</p></div></div>
            <form onSubmit={createFamily}>
              <label htmlFor="family-name">Family name</label>
              <input id="family-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder="e.g. Singh family" disabled={!!busy} required/>
              <button className="family-button primary" disabled={!name.trim() || !!busy}>{busy === 'create' ? 'Creating…' : 'Create family'}<FiPlus/></button>
            </form>
            <p className="family-hint"><FiShield/>As the family head, you can manage members.</p>
          </section> : <section className="family-card family-join-card">
            <div className="family-section-heading"><span className="family-icon"><FiUsers/></span><div><h2>Join a family</h2><p>Find your household and share its inventory.</p></div></div>
            <label className="family-search"><FiSearch/><input aria-label="Search families" placeholder="Type your family’s name" value={search} onChange={event => setSearch(event.target.value)}/></label>
            <div className="family-available-list">{filteredFamilies.length ? filteredFamilies.map(item => <div className="family-available" key={item._id}>
              <span className="family-available-icon"><FiHome/></span><div><strong>{item.name}</strong><span>{item.members?.length || 0} members</span></div>
              <button className="family-button secondary" aria-label={`Join ${item.name}`} onClick={() => joinFamily(item._id)} disabled={!!busy}>{busy === item._id ? 'Joining…' : 'Join family'}</button>
            </div>) : <div className="family-empty"><p>{search ? 'No families match your search.' : 'No families yet. Create one to get started.'}</p></div>}</div>
          </section>}
          </div>
        </div>}
      </div>
    </section>
    <Footer/>
    {pendingMember && <div className="family-confirm-backdrop"><section className="family-confirm family-card" role="dialog" aria-modal="true" aria-labelledby="family-confirm-title">
      <h2 id="family-confirm-title">{pendingMember._id === user._id ? 'Leave this family?' : `Remove ${pendingMember.userName || 'this member'}?`}</h2>
      <p>{pendingMember._id === user._id ? 'You’ll no longer have access to this family’s shared inventory. You can join a family again later.' : 'This member will no longer have access to your family’s shared inventory.'}</p>
      <div className="family-confirm-actions"><button ref={cancelRef} className="family-button secondary" onClick={() => setPendingMember(null)} disabled={!!busy}>Cancel</button><button className="family-button danger" onClick={removeMember} disabled={!!busy}>{busy ? 'Updating…' : pendingMember._id === user._id ? 'Leave family' : 'Remove member'}</button></div>
    </section></div>}
  </>;
}
