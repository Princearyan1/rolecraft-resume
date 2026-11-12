# Rolecraft

Resume + job description → tailored summary, experience and skills → template selection, review, editing and PDF/TXT export.

Deploy as a Node.js web service using render.yaml (Free plan). Set GROQ_API_KEY as a secret in Render. Never commit an API key or .env file. Render supplies PORT and RENDER_EXTERNAL_URL automatically.

Run locally: set GROQ_API_KEY in the environment, then npm start. Open http://127.0.0.1:4173. Run npm test for validation tests.

AI: Groq, openai/gpt-oss-120b. Free account rate limits apply. AI edits preserve protected identity/employment lines and numbers; review the final wording for accuracy. Use clear section headings and experience bullets. Original section order can be retained; exact uploaded PDF/DOCX styling is not retained.

PDF/DOCX/TXT extraction runs in-browser. Rewriting sends text to Groq through the server. No resume database is used; drafts remain only in the tab. External fonts and document-reader libraries load from Google Fonts and cdnjs.
