// Adapted from HACKED2024/client/src/utilities.js and Exercisetracker.js.
// Keep the geometry independent from TensorFlow so the page loads on demand.
export const POINTS = { LEFT_SHOULDER: 5, RIGHT_SHOULDER: 6, LEFT_ELBOW: 7, RIGHT_ELBOW: 8, LEFT_WRIST: 9, RIGHT_WRIST: 10, LEFT_HIP: 11, RIGHT_HIP: 12, LEFT_KNEE: 13, RIGHT_KNEE: 14, LEFT_ANKLE: 15, RIGHT_ANKLE: 16 };
const connections = [[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];
export function findAngle(a,b,c) {
  const ab = Math.hypot(a.x-b.x,a.y-b.y), cb = Math.hypot(c.x-b.x,c.y-b.y);
  if (!ab || !cb) return null;
  const cosine = ((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y))/(ab*cb);
  return Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI;
}
export function drawPose(ctx,keypoints) {
  const visible = point => point && point.score >= .25;
  ctx.strokeStyle='#f4a348'; ctx.fillStyle='#fff'; ctx.lineWidth=4;
  connections.forEach(([a,b])=>{if(visible(keypoints[a])&&visible(keypoints[b])){ctx.beginPath();ctx.moveTo(keypoints[a].x,keypoints[a].y);ctx.lineTo(keypoints[b].x,keypoints[b].y);ctx.stroke();}});
  keypoints.slice(5).filter(visible).forEach(point=>{ctx.beginPath();ctx.arc(point.x,point.y,5,0,2*Math.PI);ctx.fill();});
}
// Hysteresis counts a complete movement, not time spent holding an endpoint.
// Each arm retains its own cycle through short confidence dropouts.
function createArmCounter(side) {
  let phase='ready', smoothed=null, lastSeen=null, startedAt=0, lastRep=-Infinity;
  return (keypoints,now) => {
    const points=['SHOULDER','ELBOW','WRIST'].map(name=>keypoints[POINTS[`${side.toUpperCase()}_${name}`]]);
    const visible=points.every(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.score>=.25);
    if(!visible){
      if(lastSeen!==null&&now-lastSeen>1000){phase='ready';smoothed=null;}
      return {counted:false,visible:false,angle:null,phase};
    }
    if(lastSeen!==null&&now-lastSeen>1000){phase='ready';smoothed=null;}
    lastSeen=now;
    const angle=findAngle(...points);
    if(angle===null)return {counted:false,visible:false,angle:null,phase};
    smoothed=smoothed===null?angle:angle*.65+smoothed*.35;
    let counted=false;
    if(phase!=='ready'&&now-startedAt>12000)phase='ready';
    if(phase==='ready'&&smoothed>=130){phase='curl';startedAt=now;}
    else if(phase==='curl'&&smoothed<=85)phase='lower';
    else if(phase==='lower'&&smoothed>=130){
      // A full cycle plus a short cooldown rejects flicker without requiring
      // the user to pause at a particular angle for several video frames.
      counted=now-startedAt>=300&&now-lastRep>=450;
      if(counted)lastRep=now;
      phase='curl';startedAt=now;
    }
    return {counted,visible:true,angle:Math.round(smoothed),phase};
  };
}
export function createCurlCounter() {
  const left=createArmCounter('left'), right=createArmCounter('right');
  return (keypoints,now=performance.now()) => {
    const arms={left:left(keypoints,now),right:right(keypoints,now)};
    const visible=Object.values(arms).filter(arm=>arm.visible);
    let prompt='Step back so your elbows and wrists are in view.';
    if(visible.length){
      if(visible.some(arm=>arm.phase==='lower'))prompt='Lower your arm to finish the rep.';
      else if(visible.some(arm=>arm.phase==='curl'))prompt='Curl either arm, then lower it.';
      else prompt='Start with your arms lowered.';
    }
    return {arms,increment:Number(arms.left.counted)+Number(arms.right.counted),visibleArms:visible.length,prompt};
  };
}
