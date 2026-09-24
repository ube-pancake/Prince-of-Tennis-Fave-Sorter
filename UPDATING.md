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
```

Examples:

```text
public/players/seigaku/ryoma-echizen.webp
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

Use `.webp` files and keep the names lowercase with hyphens. The exact expected filename for every character is generated in `src/data.js`. Square or 4:5 portraits work best. A character automatically keeps the colored initials design until their matching image file exists.

### Converting an image to WebP

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

