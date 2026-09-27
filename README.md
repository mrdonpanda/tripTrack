# Trip Tracker

Trip Tracker is a personal Android app for a car-carrier driver. One trip is one city. On a trip the driver logs about 9 to 15 cars, types each lot number, and shoots seven angles of each car. The home screen shows the current Monday–Sunday week. A week screen copies the pay and expense lines for the office. Expenses are listed beside pay and are not subtracted from it.

## 1. Architecture and tech stack

The app is an Expo SDK 57 project written in TypeScript. React Native 0.86 draws the screens. Expo Router owns navigation from the `app/` directory. Supabase is the database, the login service, and the photo store.

| Piece | Role |
| --- | --- |
| Expo Router | File routes. `/` is this week, `/sign-in` is login, `/trip/new` starts a trip, `/trip/[id]` is one city, `/cities` edits city pay, `/week` copies the week sheet. |
| `@supabase/supabase-js` | Auth, Postgres, and Storage. The client is created in `src/lib/supabase.ts`. |
| `expo-camera` | `<CameraView>` for the lot photos. A postinstall patch lets Android open the widest back lens. |
| `react-native-volume-manager` | Volume Up and Volume Down take the picture while the viewfinder is open. |
| `expo-image-manipulator` | Shrinks each shot to a JPEG whose longest edge is 1600px. |
| `expo-media-library` | Copies that JPEG into the phone album `TripTracker`. |
| AsyncStorage | Keeps the login session and the upload queue on the device. |

The interface is black with white type and yellow buttons, sized for gloves and bright sun.

Native camera and volume behavior is not available in Expo Go. Install a development or preview build. `npm install` runs `scripts/patch-expo-camera.mjs`, `scripts/patch-camera-zoom.mjs`, and `scripts/patch-volume-shutter.mjs`, which patch those libraries inside `node_modules` before a native build.

Android package: `boo.orale.triptracker`.

## 2. User authentication

Sign-in is Supabase email and password.

`app/sign-in.tsx` calls `supabase.auth.signInWithPassword`. **Create account** calls `supabase.auth.signUp`. If the project requires email confirmation and no session comes back, the screen tells the driver to confirm the email and then sign in. A failed login or signup prints the Supabase message under the form.

`src/lib/auth.tsx` loads the session once with `getSession`, then stays in sync with `onAuthStateChange`. On Android the session is stored in AsyncStorage. The client refreshes the token automatically and does not look for a session in the URL.

Routing lives in two layouts:

1. `app/(main)/_layout.tsx` waits until auth is ready. With no session it redirects to `/sign-in`.
2. `app/sign-in.tsx` redirects to `/` when a session already exists. `/` is the home screen, **This week**.

After a session exists, the same layout calls `seedCitiesIfNeeded`. The first time a user has no cities, it inserts Pittsburgh, Altoona, Buffalo, Rochester, and Syracuse, then sets `user_metadata.cities_seeded`. The main stack stays on **Setting up cities** until that finishes. A seed failure stays on screen with **Try again**. The upload queue is created only after seeding, scoped to `session.user.id`.

Sign-out calls `supabase.auth.signOut()` from the home screen. The auth listener clears the session and the main layout returns to `/sign-in`.

## 3. Database connection and schema

### Connection

`app.config.js` reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the process environment or from `.env`, then places them on `extra`. `src/lib/config.ts` reads that `extra` block through `expo-constants`. `src/lib/supabase.ts` passes those two values to `createClient`.

The publishable key is the client key. The secret key is never read by the app and must not be added to `extra`, `eas.json`, or git.

If either client value is missing, the sign-in screen says the Supabase URL and publishable key are missing.

### Tables

Every row belongs to one user through `user_id`.

```text
cities
trips ──< cars ──< photos
  │
  └──< expenses (trip_id is optional)
```

- **cities.** Name and optional default pay in cents. A trip copies the pay that was set for that city at the time the trip was created.
- **trips.** One city on one date: `trip_date`, `city_name`, `pay_cents`. Pay may be null when the city has no rate yet. The home and week totals skip null pay. They do not subtract expenses.
- **cars.** Belong to one trip. `position` is 1 through 15. `lot_number` starts empty. A new trip creates nine cars. The driver can add cars up to 15 or remove the last one.
- **photos.** One row per car and angle. `angle` is one of `top`, `front`, `driver_side`, `back`, `passenger_side`, `keys`, `under_vehicle`. `image_url` is the public Storage URL. Retaking an angle upserts the same `(car_id, angle)` row.
- **expenses.** A date, an amount in cents, and a note. An expense can point at a trip. Deleting the trip leaves the expense and clears `trip_id`.

Money is stored in integer cents. `$750.00` is `75000`.

### Row Level Security

Row Level Security is enabled on `cities`, `trips`, `cars`, `photos`, and `expenses`. The `anon` role has no grants on those tables. The `authenticated` role can select, insert, update, and delete only its own rows.

| Table | Rule |
| --- | --- |
| cities, trips | `user_id = auth.uid()` |
| cars | `user_id = auth.uid()` and the parent trip belongs to `auth.uid()` |
| photos | `user_id = auth.uid()` and the parent car belongs to `auth.uid()` |
| expenses | `user_id = auth.uid()`, and if `trip_id` is set, that trip belongs to `auth.uid()` |

### Storage

Photos go to the public bucket `lotPhotos`. The bucket allows `image/jpeg`. Authenticated users can insert, update, delete, and select objects in that bucket. Because the bucket is public, anyone who has an object URL can fetch the JPEG. The `photos` table row is still protected by the policy above.

Object path:

```text
{YYYY-MM-DD}/{lotNumber}_{angle}.jpg
```

Example: `2026-09-22/123456_driver.jpg`.

The date is the trip date. The file tag is the short angle name, not the database angle id:

| Database angle | File tag |
| --- | --- |
| `top` | `top` |
| `front` | `front` |
| `driver_side` | `driver` |
| `back` | `back` |
| `passenger_side` | `passenger` |
| `keys` | `keys` |
| `under_vehicle` | `under` |

Public URL:

```text
https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/123456_driver.jpg
```

Lot numbers are trimmed, and characters other than letters, numbers, `_`, `.`, and `-` are removed before they become a file name. Two cars on the same date with the same sanitized lot number write the same object. Uploads use `upsert`, so a retake replaces that file.

SQL for this schema is in `supabase/migrations/`. Apply changes with the Supabase SQL path you use for this project. Do not put the secret key in the client while doing that.

## 4. The photo pipeline

`src/components/LotWorkspace.tsx` lists each car and its seven angles. **Shoot next** opens the first missing angle. Tapping an angle opens that angle, including a retake.

The viewfinder is `src/components/LotCamera.tsx`. It is drawn in a full-screen overlay outside the trip screen's scroll view, with `flex: 1` and the window width and height, so the preview is not collapsed to zero height.

### Capture

1. The screen asks for `android.permission.CAMERA`, then calls `Camera.requestCameraPermissionsAsync()`. `<CameraView>` is not mounted until both succeed. If permission is denied, the screen shows **Allow camera** and **Cancel**.
2. `queryCameraDevices` asks the patched camera module for the back lenses. `selectWidestBackCamera` picks the back camera with the smallest minimum zoom ratio. When the phone reports a range below 1, that minimum is the 0.5x ultrawide step. If no lens can zoom below 1, it uses the dedicated ultrawide or the shortest back lens.
3. `<CameraView>` is mounted with `facing="back"`, `zoom={0}`, `useWidestZoom`, and that camera id. The native patch keeps the zoom ratio on the lens minimum after CameraX publishes its zoom range. If that camera fails to open, the view retries once on the default back camera and still requests the widest zoom.
4. While the viewfinder is on screen, `startVolumeShutter` turns off the native volume UI and listens for `RNVMEventHardwareVolume`. Volume Up and Volume Down call `takePictureAsync()`. The native listener consumes those keys, so the ringer level does not change. Leaving the camera removes the listener and turns the normal volume UI back on.
5. The on-screen shutter calls the same `takePictureAsync({ quality: 1 })`. A second press while a capture is in progress is ignored. Android back closes the viewfinder.

The shot is handed to the upload queue immediately. The driver can open the next angle while earlier photos are still sending. Each angle chip shows the local photo, then **Sending**, **Need lot number**, **Retrying**, or **Allow photo storage**.

### Processing

`src/lib/compress.ts` runs before the gallery copy and before the upload.

`resizeToMaxEdge` caps the longer side at 1600 pixels and does not enlarge a smaller photo. `expo-image-manipulator` writes a JPEG at quality `0.8`. On Android that file is copied into the app document directory under `upload-queue/` so it survives until the upload finishes.

### Local backup

`src/lib/deviceAlbum.ts` runs after the resize and before the Supabase upload.

The app requests photo-library permission for images. The resized JPEG is copied into a device album named `TripTracker`. That album shows up in Gallery and in Files. The copy leaves the queue file in place so the upload can still read it.

If permission is denied, the queue does not upload that photo yet. The chip says **Allow photo storage**. Opening the camera again asks for permission. If Android will not ask again, **Allow photo storage** on the viewfinder opens system settings. After access is granted, the queue saves the album copy and then uploads.

### Cloud upload

`src/lib/photos.ts` reads the car's current lot number and the trip date, then builds `{YYYY-MM-DD}/{lotNumber}_{angle}.jpg`.

The JPEG bytes are uploaded to `lotPhotos` with `contentType: image/jpeg` and `upsert: true`. The `photos` row is upserted on `(car_id, angle)` with `image_url` set to the public URL. The local queue file is deleted after that row is saved.

If the lot number was empty, `photoObjectPath` throws `WaitingForLotNumber`. The queue marks the job `waiting`, does not count it as a failed attempt, and tries again about one second later. The chip says **Need lot number**. Saving the lot number writes the car, moves any photos already stored for that car to the new file name, and calls `releaseCar` so waiting jobs upload under the new name.

Changing a lot number after a successful upload moves the Storage object and updates `image_url`. Deleting a car or a trip removes the matching `lotPhotos` objects and the database rows.

### Error handling

Supabase errors are shown as text on the screen that made the request. Login, city setup, trip load, lot save, and delete failures all render `error.message` in the form. There is no separate toast layer.

The upload queue in `src/lib/uploadQueue.ts` is the path for flaky cell service. Jobs are stored in AsyncStorage under `trip-tracker-upload-queue:{userId}`. The queue keeps running while the driver shoots the next car.

| Situation | What the driver sees | What the queue does |
| --- | --- | --- |
| Upload in progress | **Sending** | Compresses, saves the album copy, then uploads. |
| Lot number still blank | **Need lot number** | Waits and retries about every second. The attempt count stays put. |
| Phone album permission denied | **Allow photo storage** | Does not upload until the album copy succeeds. |
| Network or other Supabase failure | **Retrying** | Keeps the JPEG and retries with backoff: 1s, 2s, 4s, up to 30s. |
| App restarted | The chip comes back | `load()` restores the saved jobs and continues. |

A job that was already copied into `TripTracker` is not copied again on retry. A newer shot of the same car and angle replaces the queued job.

## 5. Environment setup

Create `.env` in the project root. `.env` is gitignored.

```bash
SUPABASE_URL=https://db.orale.boo
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Those are the names `app.config.js` reads. The client does not look for `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

`SUPABASE_SECRET_KEY` may live in `.env` for one-off SQL against the project. The Expo app does not load it. Do not put it in `eas.json` or in `extra`.

`eas.json` preview builds need the same two client values in the profile `env` block so the cloud build can embed them. Preview builds an internal APK.

### Commands

```bash
npm install
npm start
npm run typecheck
npm test
npx eas-cli build -p android --profile preview
```

`npm install` applies the camera and volume patches. After changing those scripts, reinstall dependencies or run the patch scripts before the next native build.
