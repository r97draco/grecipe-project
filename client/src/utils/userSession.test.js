import axios from "axios";
import { loadOrCreateUser, userSyncErrorMessage } from "./userSession";

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));
const identity = { displayName: "Test User", email: "test@example.com", photoURL: "" };
beforeEach(() => jest.resetAllMocks());

test("an unavailable server does not trigger account creation", async () => {
  const error = new Error("Network Error");
  axios.get.mockRejectedValue(error);
  await expect(loadOrCreateUser(identity, "test-token")).rejects.toBe(error);
  expect(axios.post).not.toHaveBeenCalled();
  expect(userSyncErrorMessage(error)).toMatch(/server is unavailable/);
});

test("server failures do not trigger account creation", async () => {
  const error = { response: { status: 500 } };
  axios.get.mockRejectedValue(error);
  await expect(loadOrCreateUser(identity, "test-token")).rejects.toBe(error);
  expect(axios.post).not.toHaveBeenCalled();
});

test("a missing user is created and the full saved profile is returned", async () => {
  const profile = { _id: "saved-id", email: identity.email, userName: identity.displayName };
  axios.get.mockRejectedValue({ response: { status: 404 } });
  axios.post.mockResolvedValue({ data: profile });
  await expect(loadOrCreateUser(identity, "test-token")).resolves.toEqual(profile);
  expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/api/user/createuser"), {
    userName: identity.displayName, email: identity.email, photoURL: identity.photoURL,
  }, { headers: { Authorization: "Bearer test-token" } });
});

test("an existing user is loaded without creating another account", async () => {
  const profile = { _id: "saved-id", email: identity.email };
  axios.get.mockResolvedValue({ data: profile });
  await expect(loadOrCreateUser(identity, "test-token")).resolves.toEqual(profile);
  expect(axios.post).not.toHaveBeenCalled();
});
