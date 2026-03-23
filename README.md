# Document Presentation Mode

Document Presentation Mode is an Obsidian plugin for presenting a regular Markdown note as a wide, fullscreen, document-style canvas.

Instead of turning a note into slides, the plugin keeps the note as a single scrolling document and adjusts layout, width, spacing, and typography for large-screen reading and live walkthroughs.

## Highlights

- Present a normal Markdown note without converting it to slides
- Expand the reading width for large displays
- Increase typography scale for headings and body copy
- Hide sidebars, tab headers, and the status bar while presenting
- Keep a non-fullscreen document presentation layout for quick preview
- Preserve existing installations by keeping the internal plugin id unchanged

## Commands

- `Enter document presentation fullscreen`
- `Toggle document presentation layout`
- `Exit document presentation`

## Settings

- `Reading view only`
- `Auto-enter reading view`
- `Content width (%)`
- `Base font size (px)`
- `Line height`
- `Title scale`
- `Horizontal padding (px)`
- `Center content`
- `Hide sidebars`
- `Hide status bar`
- `Hide tab header`

## Installation for Development

1. Clone this repository.
2. Run `npm install`.
3. Run `npm run build`.
4. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at:

```text
.obsidian/plugins/obsidian-fullscreen-plugin
```

5. Reload Obsidian or restart the app.

## Compatibility Note

The project has been renamed, but the internal Obsidian plugin id is still `obsidian-fullscreen-plugin` to avoid breaking existing installs, hotkeys, and local plugin data.

## Development

```bash
npm install
npm run build
```

For iterative development:

```bash
npm run dev
```

## Acknowledgements

This project is based on the original [obsidian-fullscreen-plugin](https://github.com/Razumihin/obsidian-fullscreen-plugin) by Razumihin.

The current plugin keeps the original fullscreen entry point and extends it into a document-oriented presentation experience.
