// Contact form on the Services page. Posts to the enquiry intake; the email address stays as the fallback.
(() => {
  const form = document.querySelector("#enquiry-form");
  if (!form) return;
  const status = form.querySelector("[data-enquiry-status]");
  const button = form.querySelector("button[type=submit]");
  const opened = Date.now();
  const say = (text, state) => { status.textContent = text; status.dataset.state = state; };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    data.elapsedMs = Date.now() - opened;
    button.disabled = true;
    say("Sending…", "busy");
    try {
      const res = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "The message could not be sent.");
      form.reset();
      say("Thank you. Your message has been sent; I usually reply within a few hours.", "ok");
    } catch (error) {
      const known = error instanceof TypeError ? "The message could not be sent." : error.message;
      say(`${known} You can also email contact@santhoshbalaji.cloud.`, "error");
    } finally {
      button.disabled = false;
    }
  });
})();
