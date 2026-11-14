# Health and pose tracking

Adapted from the owner's `HACKED2024/client/src/pages/Health.js`, `Exercisetracker.js`, and `utilities.js`.

- `/health` combines editable profile details, a user-selected repetition goal, a bicep-curl tracker, and the last ten saved sessions.
- `client/src/utils/poseTracking.js` contains the adapted keypoint geometry, skeleton drawing, and curl counting. Both arms are tracked independently. Each completed arm curl adds one rep to the total, so simultaneous curls add two. A rep requires lowering, curling, and lowering the arm again. Angle smoothing, distinct upper/lower thresholds, and a cooldown prevent repeated counts from a held pose. Brief confidence dropouts retain the movement; losing an arm for more than a second resets its cycle.
- `client/src/utils/poseRuntime.js` loads TensorFlow / MoveNet Lightning only when starting the camera. Model weights download from the model provider. Camera frames are processed locally and are never uploaded.
- The tracker uses a single sequential detection loop. Stop, page navigation, logout, switching tabs, and reaching the goal release the camera and model resources.
- The old prototype's unfinished lunge / lateral raise tracking and calorie-to-repetition calculations are not enabled. The migrated feature counts bicep curls for a goal the user chooses; it does not assess exercise safety or calculate a weight-loss plan.
- Authenticated `GET /api/health`, `PUT /api/health`, and `POST /api/health/sessions` store private health profiles and session summaries separately from family-visible user records. Only the owner can access them. Session identifiers prevent duplicate saves.
- Demo data uses the existing per-tab demo storage; reset the demo to see a complete sample health profile and recent session. Live pose detection still needs a camera.

Deploy both frontend and backend changes. No new environment variables are required. The backend creates the new SQLite tables automatically. As with groceries, real saved health details on Render's free service can reset when its ephemeral filesystem is replaced.

Physical-device verification: open the HTTPS frontend, go to Health, select Start camera. Allow camera access, lower either arm, curl, and lower it again. Repeat with the other arm and with both arms together. Check one complete cycle adds one rep, holding a pose does not add reps, and stopping or leaving the page turns the camera indicator off. Save a session and refresh to check the summary persists.
