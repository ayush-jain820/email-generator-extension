const GENERATE_REPLY_URL = "https://email-generator-reply.onrender.com/api/email/generate";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "generate-email-reply") {
    return false;
  }
  if (!sender.url?.startsWith("https://mail.google.com/")) {
    sendResponse({ error: "Reply generation is only available from Gmail." });
    return false;
  }
  if (typeof message.Request !== "string" || !message.Request.trim()) {
    sendResponse({ error: "The email conversation is empty." });
    return false;
  }
  if (typeof message.tone !== "string" || !message.tone.trim()) {
    sendResponse({ error: "Select a reply tone before generating." });
    return false;
  }

  fetch(GENERATE_REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      Request: message.Request,
      tone: message.tone
    })
  })
    .then(async (response) => {
      const body = await response.text();
      let result = body;
      if (body) {
        try {
          result = JSON.parse(body);
        } catch {
          result = body;
        }
      }

      if (!response.ok) {
        const detail = typeof result === "string"
          ? result
          : result.message || result.error || "";
        throw new Error(detail || `Backend request failed (${response.status}).`);
      }
      return result;
    })
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({
      error: error.message || "Could not connect to the Spring backend."
    }));

  return true;
});
