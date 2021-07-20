import {
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
  Plugin,
} from "obsidian";

enum TaskType {
  TODO = "TODO",
  DONE = "DONE",
  DOING = "DOING",
  LATER = "LATER",
  CANCELED = "CANCELED",
  UNKNOWN = "UNKNOWN",
}

enum TaskCSSClass {
  COMPLETE = "logseq-complete-task",
  INCOMPLETE = "logseq-incomplete-task",
  KEYWORD = "logseq-keyword",
}

const VERSION = "0.0.4";

class LogSeqRegExes {
  static parseTaskType(content: string): TaskType {
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

  static HEADING_REGEX = {
    h1: /(?:\s+)?- # (?:.*)$/gms,
    h2: /(?:\s+)?- ## (?:.*)$/gms,
    h3: /(?:\s+)?- ### (?:.*)$/gms,
    h4: /(?:\s+)?- #### (?:.*)$/gms,
    h5: /(?:\s+)?- ##### (?:.*)$/gms,
  };

  static BEGIN_BLOCK_REGEX = new RegExp(
    /\#\+BEGIN_(WARNING|IMPORTANT|QUOTE|CAUTION)/gms
  );
  static END_BLOCK_REGEX = new RegExp(
    /\#\+END_(WARNING|IMPORTANT|QUOTE|CAUTION)/gms
  );

  static isBlock(content: string): boolean {
    return LogSeqRegExes.BEGIN_BLOCK_REGEX.test(content);
  }
}

class CodeMirrorOverlays {
  static headingsOverlay = {
    token: (stream: any) => {
      if (stream.match(LogSeqRegExes.HEADING_REGEX["h1"])) {
        return "header-1";
      } else if (stream.match(LogSeqRegExes.HEADING_REGEX["h2"])) {
        return "header-2";
      } else if (stream.match(LogSeqRegExes.HEADING_REGEX["h3"])) {
        return "header-3";
      } else if (stream.match(LogSeqRegExes.HEADING_REGEX["h4"])) {
        return "header-4";
      } else if (stream.match(LogSeqRegExes.HEADING_REGEX["h5"])) {
        return "header-5";
      } else {
        stream.next();
      }
    },
  };
  static cmAddHeadingOverlay(cm: CodeMirror.Editor) {
    cm.addOverlay(CodeMirrorOverlays.headingsOverlay);
  }

  static cmRemoveHeadingOverlay(cm: CodeMirror.Editor) {
    cm.removeOverlay(CodeMirrorOverlays.headingsOverlay);
  }
}

function createKeywordElement(keyword: string): HTMLElement {
  const element = document.createElement("span");
  element.classList.add(TaskCSSClass.KEYWORD);
  element.textContent = keyword;
  return element;
}

function createCheckboxElement(checked: boolean = false): HTMLElement {
  const element = document.createElement("input");
  element.type = "checkbox";
  element.checked = checked;
  return element;
}

export default class LogSeqPlugin extends Plugin {
  static removeProperties(content: string): string {
    return content
      .replace(/doing:: (?:\d{13})/, "")
      .replace(/done:: (?:\d{13})/, "")
      .replace(/todo:: (?:\d{13})/, "")
      .replace(/doing:: (?:\d{13})/, "")
      .replace(/later:: (?:\d{13})/, "")
      .replace(/canceled:: (?:\d{13})/, "")
      .replace(
        /id:: (?:[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})/i,
        ""
      )
      .replace(/collapsed:: (?:true|false)/gms, "");
  }

  static processChildren(el: Element, keyword: string) {
    el.childNodes.forEach((child) => {
      if (child.nodeType == Node.TEXT_NODE) {
        if (child.nodeValue.startsWith(keyword)) {
          child.nodeValue = child.nodeValue.replace(keyword, "");
        }
        child.nodeValue = LogSeqPlugin.removeProperties(child.nodeValue);
      }
    });
  }

  static styleNode(el: Element, classname: TaskCSSClass) {
    el.querySelectorAll("li[data-line]").forEach((child) => {
      // Do not "complete" the child tasks, since this is LogSeq's behaviour
      child.classList.add(TaskCSSClass.INCOMPLETE);
    });
    el.classList.add(classname);
  }

  static postprocessor: MarkdownPostProcessor = (
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
    const entries = el.querySelectorAll("li[data-line]");

    entries.forEach((entry) => {
      // Check if the entry is a org-mode block
      if (LogSeqRegExes.isBlock(entry.innerHTML)) {
        let replacedBlock = entry.innerHTML.replace(
          LogSeqRegExes.BEGIN_BLOCK_REGEX,
          "<blockquote> &#9759;"
        );
        replacedBlock = replacedBlock.replace(
          LogSeqRegExes.END_BLOCK_REGEX,
          "</blockquote>"
        );
        entry.innerHTML = replacedBlock;
      }
      const taskType = LogSeqRegExes.parseTaskType(entry.textContent);

      if (taskType == TaskType.DONE) {
        LogSeqPlugin.processChildren(entry, TaskType.DONE);

        entry.insertAdjacentElement("afterbegin", createCheckboxElement(true));
        LogSeqPlugin.styleNode(entry, TaskCSSClass.COMPLETE);
      } else if (taskType == TaskType.TODO) {
        LogSeqPlugin.processChildren(entry, TaskType.TODO);

        entry.insertAdjacentElement(
          "afterbegin",
          createKeywordElement(TaskType.TODO)
        );

        entry.insertAdjacentElement("afterbegin", createCheckboxElement());
        LogSeqPlugin.styleNode(entry, TaskCSSClass.INCOMPLETE);
      } else if (taskType == TaskType.DOING) {
        LogSeqPlugin.processChildren(entry, TaskType.DOING);

        entry.insertAdjacentElement(
          "afterbegin",
          createKeywordElement(TaskType.DOING)
        );

        entry.insertAdjacentElement("afterbegin", createCheckboxElement());
      } else if (taskType == TaskType.LATER) {
        LogSeqPlugin.processChildren(entry, TaskType.LATER);

        entry.insertAdjacentElement(
          "afterbegin",
          createKeywordElement(TaskType.LATER)
        );

        entry.insertAdjacentElement("afterbegin", createCheckboxElement());
        LogSeqPlugin.styleNode(entry, TaskCSSClass.INCOMPLETE);
      } else if (taskType == TaskType.CANCELED) {
        LogSeqPlugin.processChildren(entry, TaskType.CANCELED);
        LogSeqPlugin.styleNode(entry, TaskCSSClass.COMPLETE);
      }
    });
  };

  onload() {
    console.log(`Loading logseq-compat plugin ${VERSION}`);
    this.registerMarkdownPostProcessor(LogSeqPlugin.postprocessor);
    // Style headings in source editing
    this.registerCodeMirror(CodeMirrorOverlays.cmAddHeadingOverlay);
  }

  onunload() {
    console.log(`unloading logseq-compat plugin ${VERSION}`);
    this.registerCodeMirror(CodeMirrorOverlays.cmRemoveHeadingOverlay);
  }
}
