# ✦ Buildify — AI App Builder

## Setup

1. Push this folder to a GitHub repo
2. Import to Vercel
3. Add these environment variables in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://zsnzfbphhomncutpbegw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REQUESTY_API_KEY=rqsty-sk-J6BzVXvkS1+...
```

4. In Supabase dashboard → Authentication → Settings → **turn off "Confirm email"**
5. Deploy!

## Stack
- Next.js 14 (App Router)
- Supabase (auth + database)
- Claude via Requesty API
- Edge runtime API
