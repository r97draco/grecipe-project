import { toast } from 'react-toastify';
let scope = 0;
export const notificationScope = () => scope;
export function clearNotifications() {
  scope += 1;
  toast.dismiss();
  toast.clearWaitingQueue();
}
export function notify(message, type = 'default', expectedScope) {
  if (expectedScope !== undefined && expectedScope !== scope) return;
  const options = {toastId:`${type}:${message}`,autoClose:3000};
  const show = type === 'warning' ? toast.warn : toast[type];
  (typeof show === 'function' ? show : toast)(message,options);
}
