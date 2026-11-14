import axios from "axios";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:9191";

export async function loadOrCreateUser(firebaseUser, token) {
  const config = { headers: { Authorization: `Bearer ${token}` } };
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
  const response = await axios.post(`${apiUrl}/api/user/createuser`, {
    userName: firebaseUser.displayName,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL,
  }, config);
  return response.data;
}

export function userSyncErrorMessage(error) {
  if (!error.response) {
    return "Google sign-in succeeded, but the app server is unavailable. Start the server and try again.";
  }
  return "Google sign-in succeeded, but your profile could not be loaded. Please try again.";
}
