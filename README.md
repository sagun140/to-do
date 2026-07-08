# To-Do

Simple personal task list with alarms. No accounts, no server — tasks live in
your phone's local storage. Installable as an app on iPhone.

## Use it on your iPhone

1. Open the app URL in **Safari** (see the GitHub Pages link on this repo).
2. Tap **Share → Add to Home Screen**.
3. Open it from the home screen like any app.
4. The first time you set an alarm, allow notifications when asked.

## Features

- Add tasks fast: type, hit ＋.
- Optional alarm per task: tap ⏰, pick date/time.
- When an alarm is due you get a notification, sound, and the task turns red.
- Tap a task to edit its text or alarm. Check it off, or ✕ to delete.
- Works offline once installed.

## Alarm caveat (iOS)

A plain web app can only fire notifications **while it is open** (foreground).
If the app is closed, you'll see the overdue task highlighted the next time you
open it, but no lock-screen alarm. Guaranteed alarms with the app closed would
need a push server — easy to add later if it matters.

## Development

Static files, no build step:

```
python3 -m http.server 4173
# open http://localhost:4173
```

- `index.html` / `style.css` — UI
- `app.js` — tasks, storage, alarms
- `sw.js` — offline cache (bump `CACHE` version when changing files)
