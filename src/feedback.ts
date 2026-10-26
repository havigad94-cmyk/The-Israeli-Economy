// Questions, corrections and suggestions from readers. Messages are stored in a Supabase table that the public can
// only write to (row-level security: insert only, no reading), and the site admin reads them in the Supabase dashboard.
import { FEEDBACK } from "./config";
import { DB } from "./data";
import { state } from "./state";

type Kind = "missing" | "correction" | "question" | "improvement";
const KINDS: [Kind, string][] = [["missing", "מידע חסר"], ["correction", "תיקון טעות"], ["question", "שאלה"], ["improvement", "הצעה לשיפור"]];
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

let db: DB, dlg: HTMLDialogElement, openedAt = 0;

export function initFeedback(data: DB) {
  db = data;
  dlg = document.getElementById("fbDlg") as HTMLDialogElement;
  dlg.innerHTML = `<form method="dialog" class="fbclose"><button class="close" aria-label="סגירה">×</button></form>
    <form id="fbForm" novalidate>
      <p class="eyebrow">שאלות, תיקונים והצעות</p>
      <h2 id="fbTitle">עזרו לנו לשפר את המפה</h2>
      <fieldset class="fbkinds"><legend class="vh">סוג הפנייה</legend>
        ${KINDS.map(([k, t], i) => `<label class="chip"><input type="radio" name="kind" value="${k}" ${i === 0 ? "checked" : ""}><span>${t}</span></label>`).join("")}
      </fieldset>
      <label for="fbMsg" class="fblabel">לא מצאתם את מה שחיפשתם? תרשמו לנו כאן מה חסר ונוסיף אותו למאגר ולמערכת.</label>
      <textarea id="fbMsg" name="message" rows="5" maxlength="4000" required placeholder="למשל: חסרה החברה X, ולפי הדוח השנתי של 2025 משפחת Y מחזיקה בה 40%. מצרפים קישור למקור."></textarea>
      <div class="fbrow"><label for="fbEmail" class="fblabel small">אימייל לתשובה (לא חובה)</label><input id="fbEmail" name="email" type="email" maxlength="200" autocomplete="email" inputmode="email" placeholder="name@example.com"></div>
      <label class="fbentity" id="fbEntityWrap" hidden><input type="checkbox" id="fbEntity" checked> <span>לצרף את הגוף שפתוח עכשיו: <b id="fbEntityName"></b></span></label>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="fberr" id="fbErr" role="alert" hidden></p>
      <div class="fbactions"><button type="submit" class="primary" id="fbSend">שליחת ההודעה</button><span class="empty">ההודעה מגיעה ישירות למנהל המערכת. אנחנו לא מפרסמים אותה.</span></div>
    </form>
    <div id="fbDone" class="fbdone" hidden aria-live="polite">
      <div class="okmark" aria-hidden="true">✓</div>
      <h2>תודה! ההודעה התקבלה</h2>
      <p>נבדוק את מה שכתבתם ונעדכן את המאגר. אם השארתם אימייל, נחזור אליכם כשהתיקון יעלה.</p>
      <div class="fbactions"><button type="button" id="fbAgain">כתיבת הודעה נוספת</button><button type="button" class="primary" id="fbClose">חזרה למפה</button></div>
    </div>`;
  const form = dlg.querySelector("#fbForm") as HTMLFormElement;
  form.addEventListener("submit", (e) => { e.preventDefault(); send(form); });
  dlg.querySelector("#fbAgain")!.addEventListener("click", () => reset());
  dlg.querySelector("#fbClose")!.addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.querySelectorAll("[data-feedback]").forEach((b) => b.addEventListener("click", () => openFeedback((b as HTMLElement).dataset.feedback as Kind)));
}

function reset() {
  (dlg.querySelector("#fbForm") as HTMLFormElement).hidden = false;
  (dlg.querySelector("#fbDone") as HTMLElement).hidden = true;
  (dlg.querySelector("#fbMsg") as HTMLTextAreaElement).value = "";
  err("");
}

export function openFeedback(kind: Kind = "missing", entityId: string | null = state.selected) {
  reset();
  const k = dlg.querySelector(`input[name=kind][value=${kind || "missing"}]`) as HTMLInputElement | null;
  if (k) k.checked = true;
  const n = entityId && !entityId.startsWith("e:") ? db.byId[entityId] : null;
  (dlg.querySelector("#fbEntityWrap") as HTMLElement).hidden = !n;
  (dlg.querySelector("#fbEntityName") as HTMLElement).textContent = n?.name || "";
  dlg.dataset.entity = n?.id || "";
  openedAt = Date.now();
  dlg.showModal();
  setTimeout(() => (dlg.querySelector("#fbMsg") as HTMLTextAreaElement).focus(), 50);
}

function err(t: string) { const e = dlg.querySelector("#fbErr") as HTMLElement; e.textContent = t; e.hidden = !t; }

async function send(form: HTMLFormElement) {
  const fd = new FormData(form);
  const message = String(fd.get("message") || "").trim();
  const email = String(fd.get("email") || "").trim();
  if (fd.get("website")) return; // filled by bots only
  if (message.length < 8) { err("כתבו עוד כמה מילים, כדי שנבין מה חסר או מה צריך לתקן."); (form.querySelector("#fbMsg") as HTMLElement).focus(); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err("כתובת האימייל לא נראית תקינה. אפשר גם להשאיר את השדה ריק."); return; }
  if (Date.now() - openedAt < 2500) { err("רגע, עוד לא הספקנו לקרוא… נסו שוב בעוד שנייה."); return; }
  const btn = form.querySelector("#fbSend") as HTMLButtonElement;
  btn.disabled = true; btn.textContent = "שולחים…"; err("");
  const attach = (dlg.querySelector("#fbEntity") as HTMLInputElement).checked && dlg.dataset.entity;
  const body = { kind: String(fd.get("kind") || "missing"), message, email: email || null, page_url: location.href.slice(0, 1000), entity_id: attach || null, user_agent: navigator.userAgent.slice(0, 400) };
  try {
    const r = await fetch(`${FEEDBACK.url}/rest/v1/feedback`, { method: "POST", headers: { apikey: FEEDBACK.key, Authorization: `Bearer ${FEEDBACK.key}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(String(r.status));
    form.hidden = true;
    (dlg.querySelector("#fbDone") as HTMLElement).hidden = false;
    (dlg.querySelector("#fbClose") as HTMLElement).focus();
  } catch {
    const gh = `${FEEDBACK.fallback}?title=${encodeURIComponent("פנייה מהמפה")}&body=${encodeURIComponent(message + "\n\n" + location.href)}`;
    err("");
    const e = dlg.querySelector("#fbErr") as HTMLElement;
    e.innerHTML = `ההודעה לא נשלחה, כנראה בגלל בעיית חיבור. נסו שוב בעוד רגע, או <a href="${esc(gh)}" target="_blank" rel="noopener">שלחו אותה דרך GitHub</a>.`;
    e.hidden = false;
  } finally { btn.disabled = false; btn.textContent = "שליחת ההודעה"; }
}
