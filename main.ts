import {
  App,
  MarkdownView,
  MarkdownViewModeType,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
} from "obsidian";

interface DocumentPresentationSettings {
  enabledInReadingViewOnly: boolean;
  contentWidth: number;
  baseFontSize: number;
  lineHeight: number;
  titleScale: number;
  horizontalPadding: number;
  hideSidebars: boolean;
  hideStatusBar: boolean;
  hideTabHeader: boolean;
  centerContent: boolean;
  autoEnterReadingMode: boolean;
}

interface DocumentPresentationState {
  fullscreen: boolean;
  leaf: WorkspaceLeaf | null;
  rootEl: HTMLElement | null;
  observer: MutationObserver | null;
  fullscreenHandler: (() => void) | null;
}

type MarkdownModeCapableView = MarkdownView & {
  setMode?: (mode: MarkdownViewModeType) => void | Promise<void>;
};

const DEFAULT_SETTINGS: DocumentPresentationSettings = {
  enabledInReadingViewOnly: true,
  contentWidth: 96,
  baseFontSize: 22,
  lineHeight: 1.8,
  titleScale: 1.35,
  horizontalPadding: 24,
  hideSidebars: true,
  hideStatusBar: true,
  hideTabHeader: true,
  centerContent: true,
  autoEnterReadingMode: true,
};

export default class DocumentPresentationPlugin extends Plugin {
  settings: DocumentPresentationSettings;
  documentPresentationState: DocumentPresentationState = {
    fullscreen: false,
    leaf: null,
    rootEl: null,
    observer: null,
    fullscreenHandler: null,
  };

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new DocumentPresentationSettingsTab(this.app, this));

    this.addCommand({
      id: "enter-fullscreen",
      name: "Enter document presentation fullscreen",
      callback: () => {
        void this.enterDocumentPresentation(true);
      },
    });

    this.addCommand({
      id: "toggle-layout",
      name: "Toggle document presentation layout",
      callback: () => {
        if (this.isDocumentPresentationActive()) {
          void this.exitDocumentPresentation();
        } else {
          void this.enterDocumentPresentation(false);
        }
      },
    });

    this.addCommand({
      id: "exit-presentation",
      name: "Exit document presentation",
      callback: () => {
        void this.exitDocumentPresentation();
      },
    });
  }

  onunload() {
    this.cleanupDocumentPresentation();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    if (this.isDocumentPresentationActive()) {
      this.applyDocumentPresentationStyles();
      this.applyUiVisibilityClasses();
    }
  }

  isDocumentPresentationActive(): boolean {
    return !!this.documentPresentationState.rootEl;
  }

  async enterDocumentPresentation(enterFullscreen: boolean) {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (!leaf) {
      new Notice("No active pane available.");
      return;
    }

    if (this.isDocumentPresentationActive()) {
      await this.exitDocumentPresentation();
    }

    const markdownView = this.getMarkdownView(leaf);
    if (!markdownView) {
      new Notice("Document presentation currently supports Markdown notes only.");
      return;
    }

    if (this.settings.autoEnterReadingMode) {
      // Temporarily disabled during validation to isolate view-switch regressions.
      // this.ensureReadingMode(markdownView);
    } else if (this.settings.enabledInReadingViewOnly && this.getViewMode(markdownView) !== "preview") {
      new Notice("Switch to reading view or enable auto-enter reading view in the plugin options.");
      return;
    }

    const rootEl = this.getLeafContainerEl(leaf);
    if (!rootEl) {
      new Notice("Unable to locate the active pane container.");
      return;
    }

    this.documentPresentationState = {
      fullscreen: enterFullscreen,
      leaf,
      rootEl,
      observer: null,
      fullscreenHandler: null,
    };

    rootEl.addClass("is-document-presentation-root");
    document.body.addClass("document-presentation-mode");
    this.applyUiVisibilityClasses();
    this.applyDocumentPresentationStyles();
    new Notice("Document presentation enabled");

    if (enterFullscreen) {
      const handler = () => {
        if (!document.fullscreenElement) {
          this.cleanupDocumentPresentation();
        }
      };

      this.documentPresentationState.fullscreenHandler = handler;
      document.addEventListener("fullscreenchange", handler);

      try {
        await rootEl.requestFullscreen();
      } catch {
        this.cleanupDocumentPresentation();
        new Notice("Unable to enter document presentation fullscreen.");
      }
    }
  }

  async exitDocumentPresentation() {
    if (!this.isDocumentPresentationActive()) {
      return;
    }

    const shouldExitFullscreen =
      this.documentPresentationState.fullscreen && document.fullscreenElement;

    if (shouldExitFullscreen) {
      await document.exitFullscreen();
      return;
    }

    this.cleanupDocumentPresentation();
  }

  cleanupDocumentPresentation() {
    if (this.documentPresentationState.observer) {
      this.documentPresentationState.observer.disconnect();
    }

    if (this.documentPresentationState.fullscreenHandler) {
      document.removeEventListener(
        "fullscreenchange",
        this.documentPresentationState.fullscreenHandler
      );
    }

    if (this.documentPresentationState.rootEl) {
      this.documentPresentationState.rootEl.removeClass("is-document-presentation-root");
    }

    document.body.removeClass("document-presentation-mode");
    document.body.removeClass("document-presentation-hide-sidebars");
    document.body.removeClass("document-presentation-hide-status-bar");
    document.body.removeClass("document-presentation-hide-tab-header");
    document.body.removeClass("document-presentation-center-content");
    this.clearDocumentPresentationStyles();

    this.documentPresentationState = {
      fullscreen: false,
      leaf: null,
      rootEl: null,
      observer: null,
      fullscreenHandler: null,
    };
  }

  applyUiVisibilityClasses() {
    document.body.toggleClass(
      "document-presentation-hide-sidebars",
      this.settings.hideSidebars
    );
    document.body.toggleClass(
      "document-presentation-hide-status-bar",
      this.settings.hideStatusBar
    );
    document.body.toggleClass(
      "document-presentation-hide-tab-header",
      this.settings.hideTabHeader
    );
    document.body.toggleClass(
      "document-presentation-center-content",
      this.settings.centerContent
    );
  }

  applyDocumentPresentationStyles() {
    document.body.style.setProperty(
      "--document-presentation-content-width",
      `${this.settings.contentWidth}%`
    );
    document.body.style.setProperty(
      "--document-presentation-font-size",
      `${this.settings.baseFontSize}px`
    );
    document.body.style.setProperty(
      "--document-presentation-line-height",
      `${this.settings.lineHeight}`
    );
    document.body.style.setProperty(
      "--document-presentation-title-scale",
      `${this.settings.titleScale}`
    );
    document.body.style.setProperty(
      "--document-presentation-padding-x",
      `${this.settings.horizontalPadding}px`
    );
  }

  clearDocumentPresentationStyles() {
    document.body.style.removeProperty("--document-presentation-content-width");
    document.body.style.removeProperty("--document-presentation-font-size");
    document.body.style.removeProperty("--document-presentation-line-height");
    document.body.style.removeProperty("--document-presentation-title-scale");
    document.body.style.removeProperty("--document-presentation-padding-x");
  }

  createOverlayObserver(rootEl: HTMLElement): MutationObserver {
    const observer = new MutationObserver((mutationRecords) => {
      mutationRecords.forEach((mutationRecord) => {
        mutationRecord.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (!this.shouldMoveOverlayNode(node)) {
            return;
          }

          if (node.parentElement === document.body) {
            document.body.removeChild(node);
            rootEl.appendChild(node);
          }
        });
      });

      const promptInput = rootEl.querySelector(".prompt-input");
      if (promptInput instanceof HTMLElement) {
        promptInput.focus();
      }
    });

    observer.observe(document.body, { childList: true });
    return observer;
  }

  shouldMoveOverlayNode(node: HTMLElement): boolean {
    return (
      node.matches(".modal-container") ||
      node.matches(".menu") ||
      node.matches(".prompt") ||
      node.matches(".suggestion-container") ||
      node.matches(".popover")
    );
  }

  getLeafContainerEl(leaf: WorkspaceLeaf): HTMLElement | null {
    const anyLeaf = leaf as WorkspaceLeaf & { containerEl?: HTMLElement };
    if (anyLeaf.containerEl instanceof HTMLElement) {
      return anyLeaf.containerEl;
    }

    return null;
  }

  getMarkdownView(leaf: WorkspaceLeaf): MarkdownView | null {
    const view = leaf.view;
    if (view instanceof MarkdownView) {
      return view;
    }

    return null;
  }

  getViewMode(view: MarkdownView): string {
    const modeCapableView = view as MarkdownModeCapableView;
    if (typeof modeCapableView.getMode === "function") {
      return modeCapableView.getMode();
    }

    return "preview";
  }

  ensureReadingMode(view: MarkdownView): void {
    const modeCapableView = view as MarkdownModeCapableView;
    if (
      typeof modeCapableView.getMode === "function" &&
      typeof modeCapableView.setMode === "function"
    ) {
      if (modeCapableView.getMode() !== "preview") {
        void modeCapableView.setMode("preview");
      }
    }
  }
}

class DocumentPresentationSettingsTab extends PluginSettingTab {
  plugin: DocumentPresentationPlugin;

  constructor(app: App, plugin: DocumentPresentationPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Document presentation").setHeading();

    this.addToggleSetting(
      "Reading view only",
      "Use document presentation layout only in reading view.",
      this.plugin.settings.enabledInReadingViewOnly,
      async (value) => {
        this.plugin.settings.enabledInReadingViewOnly = value;
        await this.plugin.saveSettings();
      }
    );

    this.addToggleSetting(
      "Auto-enter reading view",
      "Switch Markdown notes to reading view before entering document presentation.",
      this.plugin.settings.autoEnterReadingMode,
      async (value) => {
        this.plugin.settings.autoEnterReadingMode = value;
        await this.plugin.saveSettings();
      }
    );

    this.addNumberSetting(
      "Content width (%)",
      "Set the maximum reading width during document presentation.",
      this.plugin.settings.contentWidth,
      60,
      98,
      async (value) => {
        this.plugin.settings.contentWidth = value;
        await this.plugin.saveSettings();
      }
    );

    this.addNumberSetting(
      "Base font size (px)",
      "Control the main text size used during document presentation.",
      this.plugin.settings.baseFontSize,
      16,
      28,
      async (value) => {
        this.plugin.settings.baseFontSize = value;
        await this.plugin.saveSettings();
      }
    );

    this.addNumberSetting(
      "Line height",
      "Increase spacing between lines for reading on larger screens.",
      this.plugin.settings.lineHeight,
      1.4,
      2.2,
      async (value) => {
        this.plugin.settings.lineHeight = value;
        await this.plugin.saveSettings();
      }
    );

    this.addNumberSetting(
      "Title scale",
      "Scale headings up for document presentation.",
      this.plugin.settings.titleScale,
      1,
      1.8,
      async (value) => {
        this.plugin.settings.titleScale = value;
        await this.plugin.saveSettings();
      }
    );

    this.addNumberSetting(
      "Horizontal padding (px)",
      "Adjust the left and right padding of the presented document.",
      this.plugin.settings.horizontalPadding,
      16,
      96,
      async (value) => {
        this.plugin.settings.horizontalPadding = value;
        await this.plugin.saveSettings();
      }
    );

    this.addToggleSetting(
      "Center content",
      "Keep the note centered during document presentation.",
      this.plugin.settings.centerContent,
      async (value) => {
        this.plugin.settings.centerContent = value;
        await this.plugin.saveSettings();
      }
    );

    this.addToggleSetting(
      "Hide sidebars",
      "Hide left and right sidebars while document presentation is active.",
      this.plugin.settings.hideSidebars,
      async (value) => {
        this.plugin.settings.hideSidebars = value;
        await this.plugin.saveSettings();
      }
    );

    this.addToggleSetting(
      "Hide status bar",
      "Hide the bottom status bar while document presentation is active.",
      this.plugin.settings.hideStatusBar,
      async (value) => {
        this.plugin.settings.hideStatusBar = value;
        await this.plugin.saveSettings();
      }
    );

    this.addToggleSetting(
      "Hide tab header",
      "Hide tab headers while document presentation is active.",
      this.plugin.settings.hideTabHeader,
      async (value) => {
        this.plugin.settings.hideTabHeader = value;
        await this.plugin.saveSettings();
      }
    );
  }

  addToggleSetting(
    name: string,
    desc: string,
    value: boolean,
    onChange: (value: boolean) => Promise<void>
  ) {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addToggle((toggle) => {
        toggle.setValue(value).onChange((nextValue) => {
          void onChange(nextValue);
        });
      });
  }

  addNumberSetting(
    name: string,
    desc: string,
    value: number,
    min: number,
    max: number,
    onChange: (value: number) => Promise<void>
  ) {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addText((text) => {
        text.setPlaceholder(String(value));
        text.setValue(String(value));
        text.onChange((rawValue) => {
          const parsedValue = Number(rawValue);
          if (Number.isNaN(parsedValue)) {
            return;
          }

          const clampedValue = Math.min(max, Math.max(min, parsedValue));
          if (String(clampedValue) !== rawValue) {
            text.setValue(String(clampedValue));
          }

          void onChange(clampedValue);
        });
      });
  }
}
