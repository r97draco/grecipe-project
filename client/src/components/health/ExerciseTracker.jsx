import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCamera, FiCheck, FiMaximize, FiMinimize, FiSquare } from 'react-icons/fi';
import { createCurlCounter, drawPose } from '../../utils/poseTracking';
import { requestCamera, cameraErrorMessage } from '../../utils/camera';

export default function ExerciseTracker({ target, onSave }) {
  const video=useRef(null), canvas=useRef(null), session=useRef(null), count=useRef(0);
  const [running,setRunning]=useState(false), [status,setStatus]=useState('idle');
  const [reps,setReps]=useState(0), [armReps,setArmReps]=useState({left:0,right:0}), [visibleArms,setVisibleArms]=useState(0);
  const totals=useRef({left:0,right:0});
  const [sessionTarget,setSessionTarget]=useState(target);
  const [prompt,setPrompt]=useState(''), [error,setError]=useState(''), [saved,setSaved]=useState(false), [saving,setSaving]=useState(false);
  const saveLock=useRef(false);
  const cameraRequest=useRef(null);
  const tracker=useRef(null);
  const cameraStage=useRef(null);
  const [cameraSize,setCameraSize]=useState({width:640,height:480});
  const [frameWidth,setFrameWidth]=useState(null);
  const [fullscreen,setFullscreen]=useState(false);
  useEffect(()=>{
    const stage=cameraStage.current;
    const fit=()=>{
      const viewportHeight=window.visualViewport?.height||window.innerHeight;
      const top=stage.getBoundingClientRect().top+window.scrollY;
      const availableHeight=fullscreen?stage.clientHeight:Math.max(80,viewportHeight-top-24);
      setFrameWidth(Math.max(0,Math.min(stage.clientWidth,availableHeight*cameraSize.width/cameraSize.height)));
    };
    const observer=new ResizeObserver(fit);
    observer.observe(stage);observer.observe(tracker.current);fit();
    window.addEventListener('resize',fit);
    window.visualViewport?.addEventListener('resize',fit);
    return()=>{observer.disconnect();window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);};
  },[fullscreen,cameraSize]);
  const updateCameraSize=useCallback(()=>{
    const width=video.current?.videoWidth,height=video.current?.videoHeight;
    if(!width||!height)return;
    if(canvas.current){canvas.current.width=width;canvas.current.height=height;}
    setCameraSize(previous=>previous.width===width&&previous.height===height?previous:{width,height});
  },[]);
  useEffect(()=>{
    if(!fullscreen)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const close=event=>{if(event.key==='Escape')setFullscreen(false);};
    document.addEventListener('keydown',close);
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',close);};
  },[fullscreen]);
  useEffect(()=>()=>{cameraRequest.current?.controller.abort();},[]);

  useEffect(()=>{
    if(!running)return;
    const pending=cameraRequest.current;
    let cancelled=false, stream, detector, timer, estimating=false;
    const counter=createCurlCounter();
    const stop=()=>{clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());};
    const detect=async()=>{
      if(cancelled)return;
      estimating=true;
      try {
        const poses=await detector.estimatePoses(video.current);
        if(cancelled)return;
        const ctx=canvas.current.getContext('2d');
        ctx.clearRect(0,0,canvas.current.width,canvas.current.height);
        const points=poses[0]?.keypoints||[];
        drawPose(ctx,points);
        const result=counter(points);
        setVisibleArms(result.visibleArms);setPrompt(result.prompt);
        if(result.increment){
          totals.current={left:totals.current.left+Number(result.arms.left.counted),right:totals.current.right+Number(result.arms.right.counted)};
          setArmReps(totals.current);
          count.current+=result.increment;setReps(count.current);
          if(count.current>=sessionTarget){setStatus('complete');setRunning(false);stop();return;}
        }
      } catch {
        if(!cancelled){setError('Tracking stopped. Try starting the camera again.');setStatus('error');setRunning(false);stop();}
        return;
      } finally {
        estimating=false;
        if(cancelled)detector?.dispose();
      }
      if(!cancelled)timer=setTimeout(detect,100);
    };
    const start=async()=>{
      try {
        const result=await pending.promise;
        if(result.error)throw result.error;
        stream=result.stream;
        if(cancelled){stop();return;}
        video.current.srcObject=stream;await video.current.play();
        setStatus('loading');
        const runtime=await import('../../utils/poseRuntime');
        if(cancelled)return;
        detector=await runtime.createPoseDetector();
        if(cancelled){detector.dispose();return;}
        updateCameraSize();
        session.current={id:crypto.randomUUID(),startedAt:Date.now()};
        setStatus('tracking');detect();
      }catch(failure){
        stop();
        if(cancelled)return;
        setError(cameraErrorMessage(failure));setStatus('error');setRunning(false);
      }
    };
    const hide=()=>{if(document.hidden){setRunning(false);setStatus('stopped');}};
    document.addEventListener('visibilitychange',hide);
    start();
    return()=>{cancelled=true;pending.controller.abort();stop();if(!estimating)detector?.dispose();document.removeEventListener('visibilitychange',hide);};
  },[running,sessionTarget,updateCameraSize]);

  const begin=()=>{
    if(running)return;
    cameraRequest.current?.controller.abort();
    const controller=new AbortController();
    const promise=requestCamera({facingMode:{ideal:'user'},width:{ideal:640},height:{ideal:480}},controller.signal)
      .then(stream=>({stream}),error=>({error}));
    cameraRequest.current={controller,promise};
    count.current=0;totals.current={left:0,right:0};session.current=null;setSessionTarget(target);setReps(0);setArmReps(totals.current);setVisibleArms(0);setError('');setPrompt('');setSaved(false);setStatus('starting');setRunning(true);
  };
  const save=async()=>{
    if(saveLock.current||saved||!session.current||!reps)return;
    saveLock.current=true;setSaving(true);setError('');
    const current=session.current;
    const result=await onSave({id:current.id,reps,arm:'both',leftReps:totals.current.left,rightReps:totals.current.right,seconds:Math.min(86400,Math.round(((current.endedAt||Date.now())-current.startedAt)/1000))});
    if(result)setSaved(true);
    else setError('Couldn’t save this session. Please try again.');
    saveLock.current=false;setSaving(false);
  };
  useEffect(()=>{if(!running&&session.current&&!session.current.endedAt)session.current.endedAt=Date.now();},[running]);

  return <section className={`health-tracker${fullscreen?' is-expanded':''}`} ref={tracker}>
    <div className="health-workout-toolbar"><h2>Bicep curls</h2><div className="health-tracker-controls">
      {running?<button className="health-button secondary" onClick={()=>{setRunning(false);setStatus('stopped');}}><FiSquare/>Stop camera</button>:<button className="health-button primary" onClick={begin} disabled={saving}><FiCamera/>{error?'Try again':reps?'New session':'Start camera'}</button>}
      {!running&&reps>0&&<button className="health-button secondary" onClick={save} disabled={saved||saving}>{saved?<><FiCheck/>Saved</>:saving?'Saving…':'Save session'}</button>}
      <button className="health-expand" onClick={()=>setFullscreen(value=>!value)} aria-label={fullscreen?'Exit full screen':'Full screen'} aria-pressed={fullscreen} title={fullscreen?'Exit full screen':'Full screen'}>{fullscreen?<FiMinimize/>:<FiMaximize/>}</button>
    </div></div>
    <div className="health-workout-status"><p role="status">{running?(prompt||'Getting ready…'):status==='complete'?'Goal reached. Save your session.':reps?'Session stopped.':'Each completed arm curl counts as one rep.'}</p><span>Both arms · Auto tracking</span></div>
    <progress value={Math.min(reps,sessionTarget)} max={running||reps?sessionTarget:target} aria-label="Repetition goal progress"/>
    {error&&<p className="health-alert" role="alert">{error}</p>}
    <div className="health-camera-stage" ref={cameraStage}><div className="health-camera" style={{'--camera-ratio':`${cameraSize.width} / ${cameraSize.height}`,width:frameWidth!==null?`${frameWidth}px`:'100%'}}>
      <video ref={video} onResize={updateCameraSize} onLoadedMetadata={updateCameraSize} autoPlay playsInline muted className={running?'':'health-camera-hidden'} aria-label="Exercise camera preview"/>
      <canvas ref={canvas} className={running?'':'health-camera-hidden'} aria-hidden="true"/>
      {!running&&<div className="health-camera-placeholder"><FiCamera/><p>Keep your shoulders, elbows and wrists in view.</p></div>}
      {running&&(status==='starting'||status==='loading')&&<div className="health-camera-loading" role="status">{status==='starting'?'Opening camera…':'Loading pose model…'}</div>}
      {status==='tracking'&&running&&<span className="health-live-indicator">{visibleArms===2?'Both arms visible':visibleArms===1?'One arm visible':'Move into view'}</span>}
      <div className="health-camera-counter" aria-live="polite" aria-atomic="true"><strong>{reps}</strong><span>of {running||reps?sessionTarget:target} reps</span><div><span>Left <b>{armReps.left}</b></span><span>Right <b>{armReps.right}</b></span></div></div>
    </div></div>
  </section>;
}
