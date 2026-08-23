-- Custom SQL migration file, put your code below! --
-- The Composio API key is no longer app-owned state: it lives in the CLI
-- session (`~/.composio/user_data.json`), read live via `readSessionApiKey`.
-- Existing installs persisted a plaintext copy under `connector__settings`
-- (key = 'apiKey'); purge it so no orphaned credential material lingers.
DELETE FROM `connector__settings` WHERE `key` = 'apiKey';