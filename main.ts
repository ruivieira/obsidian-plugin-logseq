import {
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
  MarkdownPreviewRenderer,
  Plugin,
} from "obsidian";

enum TaskType {
  TODO,
  DONE,
  DOING,
  LATER,
  CANCELED,
  UNKNOWN,
}

const VERSION = "0.0.2";

function parseTaskType(content: string): TaskType | null {
  if (content.startsWith("DONE ")) {
    return TaskType.DONE;
  } else if (content.startsWith("TODO ")) {
    return TaskType.TODO;
  } else if (content.startsWith("DOING ")) {
    return TaskType.DOING;
  } else if (content.startsWith("LATER ")) {
    return TaskType.LATER;
  } else if (content.startsWith("CANCELED ")) {
    return TaskType.CANCELED;
  } else {
    return TaskType.UNKNOWN;
  }
}

function removeTimestamps(content: string): string {
  return content
    .replace(/doing:: (?:\d{13})/gms, "")
    .replace(/done:: (?:\d{13})/gms, "")
    .replace(/todo:: (?:\d{13})/gms, "")
    .replace(/doing:: (?:\d{13})/gms, "")
    .replace(/later:: (?:\d{13})/gms, "")
    .replace(/canceled:: (?:\d{13})/gms, "")
    .replace(/collapsed:: (?:true|false)/gms, "")
    .replace("<br>", "");
}

const blockTest = new RegExp(/\#\+BEGIN_(WARNING|IMPORTANT|QUOTE|CAUTION)/gms);

function isBlock(content: string): boolean {
  return blockTest.test(content);
}

export default class LogSeqPlugin extends Plugin {
  static postprocessor: MarkdownPostProcessor = (
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
    const entries = el.querySelectorAll("li[data-line]");

    entries.forEach((entry) => {
      const taskType = parseTaskType(entry.textContent);

      // Check if the entry is a org-mode block
      if (isBlock(entry.innerHTML)) {
        let replacedBlock = entry.innerHTML.replace(
          /\#\+BEGIN_(WARNING|IMPORTANT|QUOTE|CAUTION)/,
          "<blockquote> &#9759;"
        );
        replacedBlock = replacedBlock.replace(
          /\#\+END_(WARNING|IMPORTANT|QUOTE|CAUTION)/,
          "</blockquote>"
        );
        entry.innerHTML = replacedBlock;
      }

      if (taskType == TaskType.DONE) {
        const replacedHTML = removeTimestamps(
          entry.innerHTML.replace("DONE", "")
        );
        entry.innerHTML = `<span class="logseq-done-task"><input type="checkbox" checked> ${replacedHTML}</span>`;
      } else if (taskType == TaskType.TODO) {
        const replacedHTML = removeTimestamps(
          entry.innerHTML.replace("TODO", "")
        );
        entry.innerHTML = `<input type="checkbox"> <span class="logseq-status-task">TODO</span> ${replacedHTML}`;
      } else if (taskType == TaskType.DOING) {
        const replacedHTML = removeTimestamps(
          entry.innerHTML.replace("DOING", "")
        );
        entry.innerHTML = `<input type="checkbox"> <span class="logseq-status-task">DOING</span> ${replacedHTML}`;
      } else if (taskType == TaskType.LATER) {
        const replacedHTML = removeTimestamps(
          entry.innerHTML.replace("LATER", "")
        );
        entry.innerHTML = `<input type="checkbox"> <span class="logseq-status-task">LATER</span> ${replacedHTML}`;
      } else if (taskType == TaskType.CANCELED) {
        const replacedHTML = removeTimestamps(
          entry.innerHTML.replace("CANCELED", "")
        );
        entry.innerHTML = `<span class="logseq-done-task">${replacedHTML}</span>`;
      }
    });
  };

  onload() {
    console.log(`Loading LogSeq plugin ${VERSION}`);
    MarkdownPreviewRenderer.registerPostProcessor(LogSeqPlugin.postprocessor);
  }

  onunload() {
    console.log(`unloading LogSeq plugin ${VERSION}`);
    MarkdownPreviewRenderer.unregisterPostProcessor(LogSeqPlugin.postprocessor);
  }
}
