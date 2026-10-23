# A small birthday journey

A Turkish third-person miniature 3D adventure for a laptop. Vite + React + TypeScript + Three.js / React Three Fiber, with a static encrypted content package. The Pages project path is `/Elis_DG/`.

## Local development

Use Node 24. Run `npm ci`, `npm run pack:private`, and `npm run dev`. The authoring folder `../private/` is deliberately outside this Git checkout. It contains `story.json`, original assets under `assets/`, and `access.txt`. The packager creates a strong password once and reuses that file on later packaging runs. Read it locally; never paste it into a command, commit, log, or URL.

Run `npm run typecheck`, `npm test`, and `npm run build`. Build runs a publication audit. Automated security tests use only synthetic fixtures and can run without private authoring inputs.

For the complete browser walkthrough, build and start `npm run preview`, then run `npm run test:e2e`. The Chromium runner reads the local private story/password without printing either. Set `PREVIEW_URL` to test another preview or deployed Pages site and `BROWSER_EXECUTABLE` for a custom Chromium path. Otherwise install the matching browser with `npx playwright install chromium`; the runner also recognizes the existing Windows Chromium cache. Screenshots and renderer counts are saved outside the checkout in `../private/qa/third-person/`.

## Visual direction

The opening begins above a bank of clouds and descends into a full-screen character lineup. Five visible 3D travellers can be selected directly or with their named buttons. The continuous world uses original procedural geometry: turquoise water, a sunny coast, a small red-sailed boat, a keepsake notebook and a flower garden. The camera follows the chosen character on foot, blends into a boat view, moves close for a red-blanket overnight sequence, reveals the island at dawn, then returns behind the same character on landing. Three golden keys are hidden around an expanded island. A fourteen-unit rainbow is the persistent destination landmark; all three distinct keys are required to open its chest. The chest contains the personal note and original voucher. The recovered notebook is the crew preparation book; voiced babbles/subtitles connect packing, waves, sleep and island arrival. The book remains beside the lantern overnight, and a short fruit-fly scene greets the crew ashore. The voucher and sealed incoming-gift hint have separate successive reveals. After the rainbow gift, all five mascots perform a30-second shared routine with individual solos, timed confetti, waves and an ongoing dance loop.

Click to capture the mouse. WASD/arrow keys move relative to the camera; mouse movement looks around, Shift runs, Space jumps and E interacts. On the boat, W/S adjust speed and A/D steer. The60–90second crossing adds currents, rolling waves, rocks and three buoy passages. Soft impacts slow/push the boat; missed gates never block the route. At the fishing stop, E casts, then holding E or repeated presses reels in the notebook. Escape releases the mouse and opens one game menu, which contains audio, assistance, memories, replay and locking. Reading a note or notebook releases the mouse automatically; the primary continue button recaptures it. Cinematics can be skipped. Replay clears the route and returns to the cloud opening.

Supplied sticker images retain their original appearance and proportions in the notebook. Only referenced private assets are packaged; the earlier background archive remains local. Audio is an original browser-generated piano motif and ocean ambience, silent until explicitly enabled in the menu. There is no in-app reduced-motion setting. The operating system's motion preference is honored automatically. WebGL context failure leaves a 2D view with accessible alternatives for completing the route.

`npm run test:motion` runs the normal-motion keyboard/mouse journey. The full runner also checks the assisted system-reduced-motion route, long-note scrolling, refresh locking, audio consent/disposal, context-loss fallback, and original PDF opening and exact-byte downloading. If a real voucher is configured, its actual local bytes are used for that check. `node e2e/adventure-check.mjs --presentation-only` checks the opening, assisted route, celebration, replay and real PDF access at laptop/mobile widths. Renderer measurements are diagnostics from the test machine.

## Content protection

Personal text and assets are encrypted locally with AES-256-GCM. Each package revision has a fresh 16-byte salt; each encrypted file has a unique 12-byte nonce. PBKDF2-SHA-256 derives the key with 600,000 iterations. Only opaque filenames, ciphertext, and generic encryption metadata are published. Keep the generated password strong: this static design cannot rate-limit guesses.

The browser derives its key in memory after password entry. It fetches and decrypts assets on demand, creates temporary blob URLs, and revokes them when the journey is locked. No passwords or keys enter persistent browser storage. Refreshing locks the journey again. This protects published material at rest; a recipient can save any content they have unlocked.

Never commit the raw chat export, private story, original sticker archive, unencrypted illustrations, voucher, or password. Do not import private inputs into application source. Repack after every private content change and commit only the new encrypted `public/locked/` files with the generic application changes.

## Adding the real voucher

The current content may contain an explicitly marked development placeholder. To integrate the original file, put it in `../private/assets/` using a unique filename stem. In the private story's `voucher`, set `status: "ready"`, `assetId` to that stem, `filename` to its intended download filename, `mime` to its actual MIME type, and include accurate description and instructions. A code and/or HTTPS redemption URL can also be supplied in the encrypted voucher data. Preserve the original file bytes. Run packaging and checks, then open and save the voucher in a phone browser before sharing the gift.

The final personal note is also deferred. Set `note.status` to `ready` and fill `note.paragraphs` with the author's final text. Until then, the note is explicitly marked pending. Story version 3, including exactly five unique avatar choices, is validated both during packaging and after authenticated decryption.

## GitHub Pages

The repository stays private. Private-repository Pages requires an eligible GitHub subscription; if unavailable, retain repository privacy and resolve hosting separately. The deployed site itself is anonymously reachable, with the encrypted content requiring its separate password.

Pushes to `main` run checks only. After Pages is enabled with GitHub Actions as its build source, manually run **Check and publish static journey** and select **deploy** to publish the checked artifact. No private input or password is needed in Actions or GitHub secrets. A preview with a voucher placeholder is not the final gift. Re-run the manual deployment after integrating and testing the actual voucher.

Expected address: https://emrepektas.github.io/Elis_DG/

The destination island is physically separated from the coast by a long sea passage, with intermediate islets and night travel before dawn arrival. Dialogue pauses the scene and waits for the player to continue; opening offers explicit sound-on or silent play. Transition, key and chest sounds are generated locally and respect mute.
