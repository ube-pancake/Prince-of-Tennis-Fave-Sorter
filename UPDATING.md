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

Use `.webp` or `.png` files and keep the names lowercase with hyphens. The app checks WebP first and then PNG, so WebP wins if both versions exist. The exact expected filename for every character is generated in `src/data.js`. Square or 4:5 portraits work best. A character automatically keeps the colored initials design until their matching image file exists.

### Optional: converting an image to WebP

Windows Paint can save an opened image as WebP on current Windows versions:

1. Open the image in Paint.
2. Choose **File → Save as**.
3. Select **WebP picture**.
4. Save it with the exact expected filename in the correct `public/players` team folder.

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
