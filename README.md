# A small birthday journey

A Turkish miniature 3D birthday journey for a laptop, with responsive touch controls. Vite + React + TypeScript + Three.js / React Three Fiber, with a static encrypted content package. The Pages project path is `/Elis_DG/`.

## Local development

Use Node 24. Run `npm ci`, `npm run pack:private`, and `npm run dev`. The authoring folder `../private/` is deliberately outside this Git checkout. It contains `story.json`, original assets under `assets/`, and `access.txt`. The packager creates a strong password once and reuses that file on later packaging runs. Read it locally; never paste it into a command, commit, log, or URL.

Run `npm run typecheck`, `npm test`, and `npm run build`. Build runs a publication audit. Automated security tests use only synthetic fixtures and can run without private authoring inputs.

For the complete browser walkthrough, build and start `npm run preview`, then run `npm run test:e2e`. The browser runner reads the local private story/password without printing either. Set `PREVIEW_URL` to test another preview or deployed Pages site, `BROWSER=webkit` for WebKit, and `BROWSER_EXECUTABLE` if Chromium is installed at a custom path. Otherwise install the matching browser with `npx playwright install chromium`; the runner also recognizes the existing Windows Chromium cache. Screenshots and renderer counts are saved outside the checkout in `../private/qa/miniature/`.

## Visual direction

The world uses original procedural geometry: turquoise water, a sunny coast, a small red-sailed boat, rounded travellers, a keepsake notebook and a flower garden. The route contains crew boarding, a playable pier with jumps, a forgiving buoy course and fishing. Movement supports keyboard and held pointer controls, with assistance available. A map revisits unlocked stops without clearing discoveries; replay starts fresh.

Supplied sticker images retain their original appearance and proportions in the notebook. Only referenced private assets are packaged; the earlier background archive remains local. Audio is an original browser-generated piano motif and ocean ambience, silent until explicitly enabled. Reduced motion and an ambient pause are available. WebGL context failure leaves a 2D view with accessible alternatives for completing the route.

`npm run test:motion` verifies simultaneous touch movement/jumping, pointer cancellation and normal-motion boarding/reeling in Chromium. Renderer measurements are diagnostics from the test machine, not a physical-phone performance guarantee. In Windows WebKit, opening the PDF produces a download; both access paths are checked for exact original bytes. The final real voucher still needs a phone opening test.

## Content protection

Personal text and assets are encrypted locally with AES-256-GCM. Each package revision has a fresh 16-byte salt; each encrypted file has a unique 12-byte nonce. PBKDF2-SHA-256 derives the key with 600,000 iterations. Only opaque filenames, ciphertext, and generic encryption metadata are published. Keep the generated password strong: this static design cannot rate-limit guesses.

The browser derives its key in memory after password entry. It fetches and decrypts assets on demand, creates temporary blob URLs, and revokes them when the journey is locked. No passwords or keys enter persistent browser storage. Refreshing locks the journey again. This protects published material at rest; a recipient can save any content they have unlocked.

Never commit the raw chat export, private story, original sticker archive, unencrypted illustrations, voucher, or password. Do not import private inputs into application source. Repack after every private content change and commit only the new encrypted `public/locked/` files with the generic application changes.

## Adding the real voucher

The current content may contain an explicitly marked development placeholder. To integrate the original file, put it in `../private/assets/` using a unique filename stem. In the private story's `voucher`, set `status: "ready"`, `assetId` to that stem, `filename` to its intended download filename, `mime` to its actual MIME type, and include accurate description and instructions. A code and/or HTTPS redemption URL can also be supplied in the encrypted voucher data. Preserve the original file bytes. Run packaging and checks, then open and save the voucher in a phone browser before sharing the gift.

The final personal note is also deferred. Set `note.status` to `ready` and fill `note.paragraphs` with the author's final text. Until then, the note is explicitly marked pending. Story version 2 is validated both during packaging and after authenticated decryption.

## GitHub Pages

The repository stays private. Private-repository Pages requires an eligible GitHub subscription; if unavailable, retain repository privacy and resolve hosting separately. The deployed site itself is anonymously reachable, with the encrypted content requiring its separate password.

Pushes to `main` run checks only. After Pages is enabled with GitHub Actions as its build source, manually run **Check and publish static journey** and select **deploy** to publish the checked artifact. No private input or password is needed in Actions or GitHub secrets. A preview with a voucher placeholder is not the final gift. Re-run the manual deployment after integrating and testing the actual voucher.

Expected address: https://emrepektas.github.io/Elis_DG/
