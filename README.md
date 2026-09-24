# Court Order

A fast, local-first Prince of Tennis character sorter inspired by Better Nijisort.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

The repository deploys automatically to GitHub Pages after each push to `main`. See [UPDATING.md](UPDATING.md) for the GitHub Desktop workflow and step-by-step portrait instructions.

## Character portraits

The app works without portraits and uses team-colored monograms as its intentional fallback. To add artwork, place `.webp` portraits in `public/players/<team-id>/` using the filename slugs in `src/data.js`.

Example: `public/players/seigaku/ryoma-echizen.webp`.

## Included features

- School and team filters for the full 74-character roster
- Pairwise merge-sort ranking with ties and undo
- Keyboard controls: H/Left, K/Up, L/Right, J/Down, and S
- Local save and resume
- Dark mode
- Shareable result URLs
- PNG and text-list exports
