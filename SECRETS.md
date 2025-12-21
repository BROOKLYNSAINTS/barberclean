Rotation and secure build steps

1) Rotate the leaked OpenAI key (urgent)
- Go to https://platform.openai.com/account/api-keys
- Revoke the exposed key and create a new one.

2) Add new key as an EAS secret (recommended)
- Install/verify EAS CLI and login: `npm i -g eas-cli` then `eas login`
- Create project-scoped secret:

  eas secret:create --name OPENAI_API_KEY --value "sk-NEW_KEY" --scope project

- This injects the secret at build time without embedding into client sources.

3) Local development
- Do NOT commit secrets. Create a `.env.local` (add to .gitignore) with:

  OPENAI_API_KEY=sk-NEW_KEY

- Ensure your local development reads `process.env.OPENAI_API_KEY` (app.config.js uses that now).

4) Rebuild and verify
- Build with EAS (preview or production profile):

  eas build --platform android --profile preview

- Download/install the AAB, then check runtime masked key in logs (we added masked logging):

  adb logcat -s ReactNativeJS:V *:S

- Look for the log line: `🔑 OPENAI key seen: <prefix>...<suffix> len=...` and confirm it matches the new key’s prefix/suffix.

5) Alternative (more secure): Move OpenAI calls to a server-side proxy so the client never handles the secret.

Notes:
- We removed public `EXPO_PUBLIC_OPENAI_API_KEY` and sanitized `.env*` files in the repo.
- Rotate any other exposed keys you consider sensitive (Firebase if you prefer).
