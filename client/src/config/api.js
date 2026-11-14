const configured=process.env.REACT_APP_API_URL?.replace(/\/$/,'');
export const backendUrl=configured || (process.env.NODE_ENV==='production' ? '' : 'http://localhost:9191');
