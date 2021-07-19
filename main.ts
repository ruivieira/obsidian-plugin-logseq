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

const HEADING_REGEX = {
  h1: /(?:\s+)?- # (?:.*)$/gms,
  h2: /(?:\s+)?- ## (?:.*)$/gms,
  h3: /(?:\s+)?- ### (?:.*)$/gms,
  h4: /(?:\s+)?- #### (?:.*)$/gms,
  h5: /(?:\s+)?- ##### (?:.*)$/gms,
};

const VERSION = "0.0.3";

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
    .replace(
      /id:: (?:[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})/gims,
      ""
    )
    .replace(/collapsed:: (?:true|false)/gms, "")
    .replace("<br>", "");
}

const blockTest = new RegExp(/\#\+BEGIN_(WARNING|IMPORTANT|QUOTE|CAUTION)/gms);

function isBlock(content: string): boolean {
  return blockTest.test(content);
}

function cmHeadingOverlay(cm: CodeMirror.Editor) {
  cm.addOverlay({
    token: (stream: any) => {
      if (stream.match(HEADING_REGEX["h1"])) {
        return "header-1";
      } else if (stream.match(HEADING_REGEX["h2"])) {
        return "header-2";
      } else if (stream.match(HEADING_REGEX["h3"])) {
        return "header-3";
      } else if (stream.match(HEADING_REGEX["h4"])) {
        return "header-4";
      } else if (stream.match(HEADING_REGEX["h5"])) {
        return "header-5";
      } else {
        stream.next();
      }
    },
  });
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
    this.registerMarkdownPostProcessor(LogSeqPlugin.postprocessor);
    // Style headings in source editing
    this.registerCodeMirror(cmHeadingOverlay);
  }

  onunload() {
    console.log(`unloading LogSeq plugin ${VERSION}`);
  }
}
