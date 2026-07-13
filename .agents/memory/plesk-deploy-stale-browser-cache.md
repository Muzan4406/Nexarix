---
    name: Admin OTP login not working after deploy = browser cache, not code bug
    description: When admin/OTP login "breaks" right after a Plesk deploy but the backend logic tests fine, suspect stale browser-cached JS bundle before touching code.
    ---

    **Symptom:** After deploying a frontend update to Plesk, users report the admin OTP input field "won't accept typed digits" or the site "looks like the old version" even though the deploy succeeded and the code (verified via direct API calls) works correctly end-to-end.

    **Root cause (confirmed in this project):** The user's own browser had cached the old JS bundle from before the deploy. Restarting the Plesk app + reloading in a private/incognito window fixed it immediately, with no code changes needed.

    **Why:** Committing built `dist`/`public` assets to git for Plesk (no separate CDN/cache-busting infra) means the browser is the only layer holding stale assets — restarting the server does not clear a client's existing cache.

    **How to apply:** Before debugging deployed-but-"broken" frontend behavior (input fields not responding, stale UI, missing features), first ask the user to hard-restart the app on the host AND retest in a private/incognito window. Only dig into code/DB if that doesn't resolve it. Verify backend logic separately (e.g. curl the API endpoints directly) to rule out server-side bugs in parallel.
    