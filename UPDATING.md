# Updating Court Order with GitHub Desktop

This project publishes itself to GitHub Pages whenever you push a commit to the `main` branch. You do not need to run a deployment command.

## Your normal update routine

1. Edit files or add portraits inside `C:\Users\Rui\Desktop\Tennis fave sorter`.
2. Open GitHub Desktop and select the `tennis-fave-sorter` repository.
3. Review the changed files shown in the left sidebar.
4. Write a short summary in the **Summary** box, such as `Add Seigaku portraits`.
5. Click **Commit to main**.
6. Click **Push origin** in the top toolbar.
7. Wait one or two minutes for the GitHub Pages workflow to finish. Refresh the public site to see the update.

Your edits stay only on this computer until you complete both the commit and the push.

## Adding character pictures

Portraits belong in:

```text
public/players/<team-id>/<character-name>.webp
public/players/<team-id>/<character-name>.png
```

Examples:

```text
public/players/seigaku/ryoma-echizen.webp
public/players/seigaku/ryoma-echizen.png
public/players/hyoutei/keigo-atobe.webp
public/players/rikkai/seiichi-yukimura.webp
```

The valid team folder IDs are:

```text
seigaku
fudomine
rudolph
yamabuki
hyoutei
rokkaku
rikkai
higa
shiten
u17
foreign
other
```

Use `.webp`, `.png` or `.jpg` files and keep the names lowercase with hyphens. If several versions exist, WebP wins, then PNG, then JPG. The exact expected filename for every character is generated from their name in `src/data.js`. A character keeps the colored initials design until a matching image file exists.

Square portraits work best: about 1200 × 1200 px (at least 800 × 800), head and shoulders, with the face in the upper half.

Each photo also has a face position in `src/faceFocus.json`, used to keep the face centered when the picture is cropped. A new photo without an entry is centered on the middle, upper third. The easiest way to set or fix it is the crop tool below. You can also edit the entry by hand: `[percent from left, percent from top]`.

If `npm run dev` is running, restart it after adding photos.

### Optional: converting an image to WebP

Windows Paint can save an opened image as WebP on current Windows versions:

1. Open the image in Paint.
2. Choose **File → Save as**.
3. Select **WebP picture**.
4. Save it with the exact expected filename in the correct `public/players` team folder.

### Fixing a photo's crop (local crop tool)

Use this when a face gets cut off, or when a photo needs trimming, like the text side of a "HAPPY BIRTHDAY" card. It only works on your computer, and the website never shows it.

1. In the project folder, run `npm run dev`.
2. Open `http://localhost:5173/?crop` in your browser.
3. Choose the character from the dropdown, or use **← Prev / Next →** (the arrow keys work too).
4. **Set the face:** click the middle of the face. Every card and the saved ranking image will center on that spot. It saves right away.
5. **Crop the photo:** click **Crop this photo…**, pick **Square**, **4:5** or **Free**, and drag the box. Drag inside it to move it, or drag a corner to resize it. Then click **Save crop**.
   - The cropped photo replaces the old one as a `.jpg`.
   - The original moves to `public/players/<team>/old/`, so nothing is lost. Old photos aren't uploaded to the website.
   - The face spot carries over to the cropped photo.
6. Check the previews on the right, or the real site at `http://localhost:5173/`.
7. Commit and push with GitHub Desktop as usual.

To undo a crop before you commit, right-click the changed photo in GitHub Desktop and choose **Discard changes**. Then delete the copy the tool put in the team's `old` folder.

### Copying photos from the Top 9 project (local import page)

1. Run `npm run dev` and open `http://localhost:5173/?import`.
2. Each colour photo from `Tennis top9/public/players` is shown next to the current photo here.
   - Photos that are already identical are skipped.
   - Black & white ones are hidden unless you tick **include black & white**.
3. Press **Replace** to use the Top 9 photo. The current one moves to the team's `old` folder.
4. Press **Keep current** to skip it.
5. If a match is wrong, change **Copy to** first.
6. The page remembers your choices in this browser, so you can stop and come back. **Start over** clears them.
7. Commit and push with GitHub Desktop as usual.

## Adding or correcting a character

Open `src/data.js` in a text editor. Character names are grouped under their team ID in the `roster` section.

- Add a name inside the correct team list to add a character.
- Correct the displayed name there if it is misspelled.
- The image filename is automatically made from the character name.

After editing, run the normal commit and push routine above.

## Collecting results in Google Sheets

Every finished sort on the live site can be sent to your own private Google Sheet. Visitors see nothing different, and only you can open the sheet.

### One-time setup

1. Create a new Google Sheet (for example `Court Order results`).
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the sample code, paste everything from `docs/google-apps-script.gs`, and click **Save**.
4. Click **Deploy → New deployment**. Click the gear icon and choose **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy**, then allow the permissions Google asks for. If Google warns that the app isn't verified, choose **Advanced → Go to (project name)**. It's your own script.
6. Copy the **Web app URL**. It ends in `/exec`.
7. Open `src/results.js` and paste the URL between the quotes on the `RESULTS_URL` line.
8. Commit and push as usual.

### What you get

- **Results** tab: one row per finished sort, with time, teams chosen, #1–#3, the full ranking, the "Neither" picks and the language.
- **Ranking** tab: the overall leaderboard, rebuilt after every new result.

Because people choose different teams, each placement is scored by how high it is in that person's list. #1 is 100, last place is 0, and "Neither" counts as 0. The leaderboard is ordered by the average of those scores, then by number of #1 finishes.

Only the live website sends results. Testing with `npm run dev` never adds rows.

### Fixing or resetting data

Delete the rows you don't want on the **Results** tab. Then in Apps Script, pick `rebuildRanking` in the function dropdown and click **Run**.

### If you change the script later

Use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. This keeps the same URL, so `src/results.js` doesn't need to change.

## Checking an update before publishing

From the project folder, run:

```text
npm run dev
```

Then open `http://127.0.0.1:5173/`. Stop the local server with `Ctrl+C` when finished.

To verify the production build:

```text
npm run build
```

## If the website does not update

1. Confirm GitHub Desktop no longer shows **Push origin**.
2. Open the repository on GitHub.
3. Select the **Actions** tab.
4. Open the newest **Deploy to GitHub Pages** run.
5. A green check means deployment succeeded. A red cross contains the error details.
6. Also try a hard refresh with `Ctrl+F5` because the browser may have cached the old site.
