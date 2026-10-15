# Aprograma editor

Editor for the Aprograma blog on Storyblok.

- Posts: search, filter by status, create, edit the fields of the `Post` schema (except those in `BLOG.hiddenFields`), cover from the library or an image URL, new options for multi-option fields such as categories (saved sorted in the schema), autosave drafts, publish, unpublish, duplicate, delete, version history with restore.
- Translations: when the space has languages, a language switcher edits the translatable fields of each language and fills them with Storyblok's AI translation for review.
- Rich text: headings, marks, lists, quotes, code blocks with language, links, video embeds and images (upload by drop or paste, or pick from the library). Copy as Markdown.
- Media library: upload with progress, drag and drop, edit alt text, title, copyright and source, folders, bulk move and delete, trash with restore.
- Unsaved changes protection, `⌘S` / `Ctrl+S` to save, light and dark themes.

## Architecture

- `src`: Vue 3, TypeScript, Vite, Tailwind CSS 4, Tiptap 3 and TanStack Query.
- `server`: Hono API that talks to the Storyblok Management API, and to the Content Delivery API for the full content of each post in a list, because the Management API only returns summaries with texts cut to about 50 characters. It runs as Netlify Functions from `netlify/functions` and through `@hono/vite-dev-server` locally, so the management token and the space preview token never reach the browser. The types for stories, assets, folders, components and the space are checked against the official Management API client. Sessions are JWTs in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie, signed with a key derived (HKDF) from the Storyblok token and the password hash, so changing either signs everyone out. Sign in is rate limited.
- `shared`: constants used by both sides.
- `types`: every TypeScript type, imported through the `#types/*` subpath. Component props stay inline.
- `tests`: `server` and `web` unit tests with Vitest, `e2e` browser tests with Playwright.
- Security headers are defined once in `vite.config.ts`, served in development and emitted as `dist/_headers` for Netlify.

## Environment

Define these variables in `.env` for local development and in Netlify for the deployed site.

| Variable              | Description                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| `STORY_ID_SPACE`      | Numeric Storyblok space id.                                                             |
| `STORY_OAUTH_TOKEN`   | Storyblok personal access token. Server only.                                           |
| `STORY_AUTH_EMAIL`    | Email or username used to sign in.                                                      |
| `STORY_AUTH_PASSWORD` | SHA-256 hex digest of the password: `printf '%s' 'password' \| shasum -a 256`.          |
| `STORY_DOMAIN_PRO`    | Public website URL, for example `https://aprograma.com/`.                               |
| `STORY_API_URL`       | Optional. Management API base URL, `https://mapi.storyblok.com/v1` by default.          |
| `STORY_CDN_URL`       | Optional. Content Delivery API base URL, `https://api.storyblok.com/v2/cdn` by default. |

## Scripts

| Command             | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `npm run dev`       | App and API on `http://localhost:5173`.                           |
| `npm run build`     | Production build into `dist`.                                     |
| `npm run typecheck` | Type-check app, server, tests and tooling.                        |
| `npm run format`    | Prettier, then ESLint autofix.                                    |
| `npm test`          | Unit and API tests with Vitest.                                   |
| `npm run test:e2e`  | Browser tests with Playwright against an in-memory Storyblok API. |
| `npm run verify`    | Type-check, lint, format check, tests, build and browser tests.   |

Run `npx playwright install chromium` once before the first end-to-end run.
