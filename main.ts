import {
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
  MarkdownPreviewRenderer,
  Plugin,
} from "obsidian";

export default class LogSeqPlugin extends Plugin {
  static postprocessor: MarkdownPostProcessor = (
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
    const entries = el.querySelectorAll("li[data-line]");

    entries.forEach((entry) => {
      const contents = entry.textContent;
      if (contents.startsWith("DONE")) {
        const replacedHTML = entry.innerHTML
          .replace("DONE", "")
          .replace(/doing:: (?:\d{13})/, "")
          .replace(/done:: (?:\d{13})/, "")
          .replace(/todo:: (?:\d{13})/, "")
          .replace("<br>", "");
        entry.innerHTML = `<span class="logseq-done-task"><input type="checkbox" checked> ${replacedHTML}</span>`;
      } else if (contents.startsWith("TODO")) {
        const replacedHTML = entry.innerHTML
          .replace("TODO", "")
          .replace(/todo:: (?:\d{13})/, "");

        entry.innerHTML = `<input type="checkbox"> <span class="logseq-status-task">TODO</span> ${replacedHTML}`;
      } else if (contents.startsWith("DOING")) {
        const replacedHTML = entry.innerHTML
          .replace("DOING", "")
          .replace(/doing:: (?:\d{13})/, "")
          .replace(/todo:: (?:\d{13})/, "");

        entry.innerHTML = `<input type="checkbox"> <span class="logseq-status-task">DOING</span> ${replacedHTML}`;
      } else if (contents.startsWith("LATER")) {
        const replacedHTML = entry.innerHTML.replace("LATER", "");

        entry.innerHTML = `<input type="checkbox"> <span class="logseq-status-task">LATER</span> ${replacedHTML}`;
      }
    });
  };

  onload() {
    console.log("loading LogSeq plugin");
    MarkdownPreviewRenderer.registerPostProcessor(LogSeqPlugin.postprocessor);
  }

  onunload() {
    console.log("unloading LogSeq plugin");
    MarkdownPreviewRenderer.unregisterPostProcessor(LogSeqPlugin.postprocessor);
  }
}
