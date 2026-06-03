## Copilot / AI Agent Instructions — Agave (Fridge-tag) App

This repository is a small React/DHIS2 app with a CLI parser for Berlinger Q-tag Fridge-tag exports. The project contains two primary concerns: the UI (React using d2-app-scripts) and the parsing/transform logic used by both the CLI and the browser.

- **Important files**
  - App shell: [src/App.jsx](src/App.jsx#L1)
  - File upload UI: [src/components/FileUploader.jsx](src/components/FileUploader.jsx#L1)
  - Parser implementation used by app/CLI: [src/utils/fridgeTagParser.js](src/utils/fridgeTagParser.js#L1)
  - Parser key constants: [src/utils/keys.js](src/utils/keys.js#L1)
  - Alternative parser/helpers (legacy/utility): [src/utils/textParser.js](src/utils/textParser.js#L1)
  - Data model transformations: [src/utils/dataModels.js](src/utils/dataModels.js#L1)
  - CLI entry: [cli.js](cli.js#L1)
  - Sample data: [data/Fridge-tag](data/Fridge-tag)
  - d2 config (build entries): [d2.config.js](d2.config.js#L1)
  - Package scripts: [package.json](package.json#L1)

- **Big picture / architecture**
  - A single-page React app (DHIS2 App Platform) is used only for interactive parsing and previewing of parsed files. The parser is pure JS, re-used by both the app UI and the CLI.
  - The parser reads indented Fridge-tag text and converts it first to a raw structure then to a cleaned JSON (`toJson`). UI displays the cleaned JSON, CLI writes it as JSON.
  - `src/utils/fridgeTagParser.js` is the canonical parser preferred by the UI/CLI. `src/utils/textParser.js` and `src/utils/dataModels.js` contain helper/parsing/data shaping logic; prefer `fridgeTagParser.js` when making changes that affect both app and CLI.

- **Developer workflows / key commands**
  - Start local dev server: `yarn start` (d2-app-scripts start)
  - Build production: `yarn build` (d2-app-scripts build)
  - Deploy to DHIS2: `yarn deploy` (runs d2-app-scripts deploy — requires credentials)
  - Run tests: `yarn test` (d2-app-scripts test)
  - CLI parse: `yarn parse data/Fridge-tag` or `node cli.js data/Fridge-tag`

- **Project-specific conventions / patterns**
  - Use `Key` token constants in [src/utils/keys.js](src/utils/keys.js#L1) as the single source of truth for token names found in Fridge-tag exported text files. If you add or adapt a field, update `Key` first.
  - Parser mapping: The parser uses indentation-based context stacks. When you add a new token, add mapping in `fridgeTagParser.js` parser logic and update the `toJson` transformation accordingly.
  - Localized strings: Add new UI text keys in [src/locales/en/translations.json](src/locales/en/translations.json) and run the platform `d2-i18n` generator if necessary. The app imports `src/locales` automatically.
  - Use the existing `FileUploader` UI pattern for new file-oriented features; prefer `selectedFile.text()` (browser File API) and pass contents to `FridgeTagParser().parseText()`.

- **Parsing and model updates — practical example**
  - Add a new token `Foo Bar` found in export lines: 
    1. Add a key constant in [src/utils/keys.js](src/utils/keys.js#L1): `FOOBAR: 'Foo Bar'`.
    2. Update `fridgeTagParser.js` switch in `_setValue` to assign parsed value to a data property (root/config/day/cert as appropriate).
    3. Update `toJson()` in `fridgeTagParser.js` to include the new field in output JSON mapping.
    4. Add (or update) tests in `src/__tests__` or extend `App.test.jsx` to include a sample raw text snippet + expected JSON result.

- **Testing and verification**
  - Unit tests: `yarn test` (Jest) — add tests for parser in `src/utils/__tests__`.
  - CLI verification: `node cli.js data/Fridge-tag` to print parsed JSON to stdout; use `-o` to write to a file.
  - UI verification: `yarn start` and open http://localhost:3000; use the FileUploader to upload a `.txt` to confirm parsing and preview.

- **Integration notes & limitations**
  - The UI currently does not upload parsed data to a server or DHIS2 via mutation; it is a standalone preview. If adding export/upload, prefer using `@dhis2/app-runtime` mutations and follow `CustomDataProvider` patterns shown in tests.
  - Two parser implementations exist. Favor `src/utils/fridgeTagParser.js` for shared app/CLI logic and use `dataModels.js` for model transformation examples.
  - Keep `toJson()` mapping and `dataModels.js` output shapes consistent to avoid mismatches between app and CLI.

If anything here is unclear or you want me to expand any section (e.g., add test templates, a parser unit test, or a PR checklist), tell me which part to elaborate and I’ll update this file.
