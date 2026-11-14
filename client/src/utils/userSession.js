import axios from "axios";

import { backendUrl as apiUrl } from "../config/api";

export async function loadOrCreateUser(firebaseUser, token, options = {}) {
  const config = { ...options, timeout:15000, headers: { Authorization: `Bearer ${token}` } };
  try {
    const response = await axios.get(`${apiUrl}/api/user/getuser`, {
      ...config,
      params: { email: firebaseUser.email },
    });
    return response.data;
  } catch (error) {
    // Only an explicit missing-user response should trigger account creation.
    if (error.response?.status !== 404) throw error;
  }
  try {
    const response = await axios.post(`${apiUrl}/api/user/createuser`, {
      userName: firebaseUser.displayName || firebaseUser.email,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    }, config);
    return response.data;
  } catch (error) {
    // Another browser tab may have created the same profile in the meantime.
    if (error.response?.status !== 409) throw error;
    const response = await axios.get(`${apiUrl}/api/user/getuser`, {
      ...config, params: {email:firebaseUser.email},
    });
    return response.data;
  }
}

export function userSyncErrorMessage(error) {
  if (!error.response) {
    return "Google sign-in succeeded, but the app server is unavailable. Start the server and try again.";
  }
  return "Google sign-in succeeded, but your profile could not be loaded. Please try again.";
}
