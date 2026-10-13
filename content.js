(() => {
  const EDITOR_SELECTOR =
    '[contenteditable="true"][role="textbox"], [contenteditable="true"][g_editable="true"]';
  const SEND_SELECTOR =
    '[role="button"][data-tooltip="Send"], [role="button"][aria-label^="Send"], button[aria-label^="Send"]';
  const TONES = ["Professional", "Friendly", "Concise", "Formal", "Appreciative"];
  const BUTTON_CLASS = "gmail-ai-reply-button";
  const PANEL_CLASS = "gmail-ai-reply-panel";

  function getComposer(editor) {
    let element = editor.parentElement;
    while (element && element !== document.body) {
      const sendButton = element.querySelector(SEND_SELECTOR);
      if (sendButton) {
        return { container: element, sendButton };
      }
      if (element.getAttribute("role") === "main") {
        break;
      }
      element = element.parentElement;
    }
    return null;
  }

  function getThreadContext(editor) {
    const main = editor.closest('[role="main"]') || document;
    const messages = Array.from(main.querySelectorAll(".a3s"))
      .map((message) => message.innerText.trim())
      .filter(Boolean);

    if (messages.length) {
      return messages.slice(-10).join("\n\n---\n\n").slice(-12000);
    }

    const subject = main.querySelector("h2")?.innerText.trim() || "";
    return [subject, main.innerText.trim()].filter(Boolean).join("\n\n").slice(-12000);
  }

  function setStatus(panel, text, isError = false) {
    const status = panel.querySelector(".gmail-ai-reply-status");
    status.textContent = text;
    status.classList.toggle("gmail-ai-reply-error", isError);
  }

  function insertReply(editor, reply) {
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    const inserted = document.execCommand("insertText", false, reply);
    if (!inserted) {
      editor.textContent = reply;
    }
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: reply }));
  }

  function extractReply(result) {
    if (typeof result === "string") {
      return result.trim();
    }
    if (result && typeof result === "object") {
      for (const key of ["reply", "generatedReply", "response", "result", "text"]) {
        if (typeof result[key] === "string" && result[key].trim()) {
          return result[key].trim();
        }
      }
    }
    throw new Error("The backend response did not contain a reply string.");
  }

  async function generateReply(editor, tone, panel) {
    const buttons = panel.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = true;
    });
    setStatus(panel, "Generating reply…");

    try {
      const thread = getThreadContext(editor);
      if (!thread) {
        setStatus(panel, "Could not find the email conversation to reply to.", true);
        return;
      }

      const result = await chrome.runtime.sendMessage({
        type: "generate-email-reply",
        Request: thread,
        tone
      });
      if (result?.error) {
        throw new Error(result.error);
      }

      const reply = extractReply(result);
      if (!reply) {
        throw new Error("The backend returned an empty reply. Please try again.");
      }

      insertReply(editor, reply);
      setStatus(panel, `${tone} reply added. You can edit it before sending.`);
    } catch (error) {
      setStatus(panel, error.message || "Could not generate a reply.", true);
    } finally {
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  function createPanel(editor) {
    const panel = document.createElement("div");
    panel.className = PANEL_CLASS;
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "Choose a reply tone");

    const toneList = document.createElement("div");
    toneList.className = "gmail-ai-reply-tones";
    for (const tone of TONES) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = tone;
      button.addEventListener("click", () => generateReply(editor, tone, panel));
      toneList.append(button);
    }

    const status = document.createElement("div");
    status.className = "gmail-ai-reply-status";
    status.setAttribute("aria-live", "polite");

    panel.append(toneList, status);
    return panel;
  }

  function addGenerator(editor) {
    if (editor.dataset.gmailAiReplyAdded) {
      return;
    }
    const composer = getComposer(editor);
    if (!composer) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.textContent = "Generate reply";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Generate an AI reply");

    const control = document.createElement("div");
    control.className = "gmail-ai-reply-control";
    const panel = createPanel(editor);
    panel.hidden = true;
    button.addEventListener("click", () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      button.setAttribute("aria-expanded", String(opening));
      if (opening) {
        panel.querySelector(".gmail-ai-reply-status").textContent = "";
      }
    });

    control.append(button, panel);
    composer.sendButton.parentElement.append(control);
    editor.dataset.gmailAiReplyAdded = "true";
  }

  function scanForComposers() {
    document.querySelectorAll(EDITOR_SELECTOR).forEach(addGenerator);
  }

  new MutationObserver(scanForComposers).observe(document.body, {
    childList: true,
    subtree: true
  });
  scanForComposers();
})();
