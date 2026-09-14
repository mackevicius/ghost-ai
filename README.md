This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Liveblocks Configuration

Set `LIVEBLOCKS_SECRET_KEY` in `.env.local` for development and in the hosting
environment for deployment. Get the secret key from your Liveblocks project
dashboard; never use a `NEXT_PUBLIC_` prefix or commit the key.

`POST /api/liveblocks-auth` accepts `{ "room": "<project-id>" }`. It requires a
Clerk session and checks project ownership or verified-email collaborator access
before getting or creating a private Liveblocks room and issuing a room-scoped
access token. Missing project access returns `403`; signed-out requests return
`401`. The server client is initialized lazily, so builds do not require the key.

This setup does not yet connect the workspace UI to Liveblocks or add a canvas.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# ghost-ai
