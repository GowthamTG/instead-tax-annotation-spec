# Record the Instead walkthrough

Use the concise 413-word [script](VIDEO-SCRIPT.md) at about **160 words per minute**. Narration takes roughly **2:38**, including the teleprompter's short section pauses. Allow additional time to switch files and show results. Aim for a natural **3–4 minute** recording; the assignment's hard limit is **5:00**.

## Have these ready

Cursor tabs, left to right:

1. `examples/f1040-2025.template.json` — wages field and basePdf block.
2. `examples/f1040-2025-payload.json` — false, wages, and dependents.
3. `src/core/layout.ts` — shrinking and fit checks.
4. `docs/DECISIONS.md` — decisions and future work.

PDF viewer tabs: clean PDF first, debug PDF second. Start on page 1 of the clean PDF. Keep Cursor's terminal at this project's root, with `npm test` and `npm run demo:fail` ready. Keep the teleprompter outside the recorded area.

## Record

1. Refresh the teleprompter. Confirm **160 wpm**, first words **“Hi, I'm Gowtham T G”**, and a total near **2:38**. If an old edited script appears, press E and select Reset to config.js, then Save.
2. Enable Do Not Disturb and hide unrelated windows. Set readable zoom in the PDF viewer and Cursor.
3. Press **Command–Shift–5**, choose **Record Selected Portion**, and frame only the demo windows. In **Options**, choose your microphone and set a five-second timer if you want a lead-in.
4. Make a 20-second microphone test and replay it. Check the voice is audible and text is legible.
5. Return the clean PDF to page 1 and restart the prompter with R. Click Record. Focus the prompter and press Space when you begin speaking.
6. Follow the silent SHOW NOW cues. Use Space to pause scrolling while switching windows; resume when ready. Do not read the cue panel aloud.
7. At the end, stop with **Command–Control–Escape** or the menu-bar stop button. Save as `submission/walkthrough.mov`.

## Screen order

| Section      | Show                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| Result       | Clean PDF: header/dependents, then page-two zero and routing digits      |
| One field    | Template: wages field, then PDF fingerprint                              |
| Data         | Payload: nested values, false, decimal wages, dependent array            |
| Placement    | Debug PDF, then layout code when the script says “Here is the fit check” |
| Verification | Run `npm test`, then `npm run demo:fail`                                 |
| Choices      | Decision table and future-work list                                      |

The teleprompter calculates cue timestamps from the current pace. Actual video time will include your extra pauses. Follow the sentence cues rather than chasing a stopwatch.

## Review and share

Watch the entire final take. Check audio, legibility, correct file switches, and duration below five minutes. Remove only unnecessary lead-in/end pauses if needed; keep the walkthrough coherent.

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 submission/walkthrough.mov
```

Upload the accepted take to Drive, set **Anyone with the link → Viewer**, and verify playback without login. Add the verified link and actual duration to the README and local email draft before sending. Recording files are excluded from Git.

[Apple's screen-recording instructions](https://support.apple.com/en-in/102618)
