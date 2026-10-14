# Recording guide — Gowtham T G

Target **4:30**. Hard limit **5:00**. Use your own voice, no webcam needed. The speech script below is also saved separately in `docs/VIDEO-SCRIPT.md` so it is easy to read on a phone or second screen.

## Stage the screen

1. Run `npm test`, `npm run demo`, and `npm run demo:fail` before recording. Do not discover dependency problems during the take.
2. Open the project in VS Code. Pre-open the template, fictional payload, specification, layout module, and decision notes. Use readable font sizes (roughly 18–22 points depending on display scaling).
3. Open the clean and debug output PDFs in Preview. Begin on the clean PDF's first-page header; precheck the zoom needed for its dependent columns and page-two zero/routing grid. Prefer one large readable window at a time over cramped halves.
4. Open the VS Code terminal at the project root, with the commands `npm test` and `npm run demo:fail` ready in history. The printed test count is 86.
5. Enable Do Not Disturb; hide unrelated apps, personal tabs, email, and notifications. Put the script on a phone or second display outside the recorded region.
6. Press **Command–Shift–5**. Select a region containing only the demonstration windows, then **Options → Microphone** and select the microphone you will use. Save the recording locally in this project's `submission` folder; recording files are ignored by Git.
7. Make a **20-second test recording**: say the opening sentence and switch from PDF to editor. Stop with the menu-bar stop control or Command–Control–Escape. Play it back and verify voice, legibility, and no unrelated content. Apple reference: https://support.apple.com/en-in/102618.

Native capture records the selected region at its display resolution. It does not offer an independent “1080p” setting. Use a readable region rather than assuming an exact output size.

## Cue sheet

| Time      | Visible action                                         | Key point                                          |
| --------- | ------------------------------------------------------ | -------------------------------------------------- |
| 0:00–0:30 | Clean PDF: header, dependents, then page-two zero      | Show the outcome immediately                       |
| 0:30–1:20 | Template: select wages entry and basePdf block         | Portable contract; independent implementation      |
| 1:20–2:10 | Payload: wages, digital false, dependent array         | Nested pointers; exact decimals; zero/false        |
| 2:10–3:00 | Debug PDF: header, dependent columns, page-two routing | Actual calibrated geometry, fit, unsupported cases |
| 3:00–3:45 | Terminal: `npm test`, then `npm run demo:fail`         | Independent verification and safe failures         |
| 3:45–4:30 | Specification/decisions                                | Tradeoffs, new-form authoring, future work         |

## Rehearse twice

First take: speak naturally and perform every action. Check your elapsed time at 1:20, 2:10, and 3:45. Second take: use only the cue sheet to make the narration conversational. Do not race through terminology or read full property lists.

If you go over 4:40, shorten the explanation rather than speeding up. Keep a little silence between screen transitions. Skip optional detail before sacrificing the failure demonstration or conclusions. A final take over five minutes must be shortened/re-recorded.

## Check the final file

Watch the **entire** recording: audible voice, stable levels, readable values, correct files, no notification/personal data, no unverified claims. Verify actual duration (QuickTime's timeline or `ffprobe`). A prepared script is not evidence of recording duration.

To inspect a saved local recording:

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 submission/walkthrough.mov
```

Save the original. If necessary trim only pauses/start/end in QuickTime; preserve the coherent walkthrough and your voice. Do not replace it with synthetic narration.

## Share and submit

Upload the accepted recording to Drive. Set **General access → Anyone with the link → Viewer**. Wait for processing, then open the link in a signed-out/incognito window and play it. Check both the start and end, not merely whether a preview page opens.

Update the README's pending walkthrough notice with the verified link and actual duration. Add the same link to the local submission email draft. Open the public repository without login, confirm its verification workflow, and download its source ZIP before sending.

A recording has not been made or uploaded merely because these materials exist. Final publication/submission status is tracked locally in `submission/STATUS.md`.
