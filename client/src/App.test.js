import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
jest.mock('./firebase/firebase', () => ({ auth: { currentUser: null }, provider: {} }));
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, callback) => { callback(null); return () => {}; },
  signInWithPopup: jest.fn(),
}));
jest.mock('axios', () => ({
  create: () => ({interceptors:{request:{use:jest.fn()},response:{use:jest.fn()}},request:jest.fn()}),
  get: jest.fn(), post: jest.fn(),
}));
test('landing action opens inventory with a sign-in prompt', () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(screen.getByText('Simplifying Meal Preparation and Grocery Budgeting')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:/try it now/i}));
  expect(screen.getByText(/Please sign in using Join/)).toBeInTheDocument();
});
