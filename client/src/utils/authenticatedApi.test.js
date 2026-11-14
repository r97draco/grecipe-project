import api from './authenticatedApi';
import { auth } from '../firebase/firebase';

jest.mock('../firebase/firebase', () => ({ auth: { currentUser: null } }));
jest.mock('axios', () => ({ create: () => ({
  interceptors: {request: {use: jest.fn()}, response: {use: jest.fn()}},
  request: jest.fn(),
}) }));
const prepare = api.interceptors.request.use.mock.calls[0][0];
const reject = api.interceptors.response.use.mock.calls[0][1];
beforeEach(() => { auth.currentUser = null; api.request.mockReset(); localStorage.clear(); });

test('signed-out requests reject without using a stale stored token', async () => {
  localStorage.setItem('self_care_token', 'stale');
  await expect(prepare({headers:{}})).rejects.toMatchObject({response:{status:401}});
});
test('requests use the current Firebase token', async () => {
  auth.currentUser = {getIdToken:jest.fn().mockResolvedValue('fresh')};
  const config = await prepare({headers:{Authorization:'stale'}});
  expect(config.headers.Authorization).toBe('Bearer fresh');
});
test('401 refreshes the token and retries once', async () => {
  auth.currentUser = {getIdToken:jest.fn().mockResolvedValue('refreshed')};
  api.request.mockResolvedValue({status:200});
  const config = {};
  await expect(reject({response:{status:401},config})).resolves.toEqual({status:200});
  expect(auth.currentUser.getIdToken).toHaveBeenCalledWith(true);
  const repeatedError = {response:{status:401},config};
  await expect(reject(repeatedError)).rejects.toBe(repeatedError);
  expect(api.request).toHaveBeenCalledTimes(1);
});
test('network failures are passed back to the page for handling', async () => {
  const error = new Error('Network Error');
  await expect(reject(error)).rejects.toBe(error);
  expect(api.request).not.toHaveBeenCalled();
});
