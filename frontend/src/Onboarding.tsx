import { useState } from "react";
import {
  Check,
  FileText,
  Heart,
  LoaderCircle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { daysUntil, skillNames } from "./data";
import { request } from "./api";
import type { Profile } from "./types";

type Props = {
  profile: Profile;
  remote: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => Promise<void>;
  onReset: () => Promise<void>;
};
export default function Onboarding({
  profile,
  remote,
  onClose,
  onSave,
  onReset,
}: Props) {
  const [value, setValue] = useState({ ...profile });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const update = <K extends keyof Profile>(key: K, next: Profile[K]) =>
    setValue((v) => ({ ...v, [key]: next }));
  async function extract(
    file: File | undefined,
    target: "cv" | "job_description",
  ) {
    if (!file) return;
    setError("");
    setUploading(target);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Please choose a file smaller than 5 MB.");
      let text: string;
      if (remote) {
        const body = new FormData();
        body.append("file", file);
        const result = await request<{ text: string; truncated: boolean }>(
          "/documents/extract",
          "POST",
          body,
        );
        text = result.text;
        if (result.truncated)
          setError(
            "We kept the first 16,000 characters. Please review the extracted text.",
          );
      } else if (file.name.toLowerCase().endsWith(".txt"))
        text = (await file.text()).slice(0, 16000);
      else
        throw new Error(
          "PDF and DOCX extraction needs the FastAPI server. In the browser demo, paste the text or upload a TXT file.",
        );
      update(target, text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading("");
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (
      daysUntil(value.interview_date) < 0 ||
      daysUntil(value.interview_date) > 180
    ) {
      setError(
        "Choose an interview date between today and 180 days from today.",
      );
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      await onSave(value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <section
        className="modal onboarding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label="Close interview setup"
          disabled={busy}
        >
          <X size={20} />
        </button>
        <div className="onboard-progress">
          {["Your goal", "Your starting point", "Your story"].map(
            (label, i) => (
              <span key={label} className={i <= step ? "current" : ""}>
                <i>{i < step ? <Check size={12} /> : i + 1}</i>
                {label}
              </span>
            ),
          )}
        </div>
        <div className="eyebrow">LET’S MAKE THIS YOURS</div>
        <h2 id="onboard-title">
          {
            [
              "A big opportunity. A clear plan.",
              "Meet yourself where you are.",
              "Bring your experience with you.",
            ][step]
          }
        </h2>
        <p className="modal-subtitle">
          {
            [
              "Tell us what you’re working towards. We’ll work backwards from there.",
              "There are no wrong answers. This helps us choose your first practice tasks.",
              "Optional context helps your coach connect practice to your own story.",
            ][step]
          }
        </p>
        <form onSubmit={submit}>
          {step === 0 && (
            <div className="form-grid">
              <label className="full-span">
                What should we call you?
                <input
                  autoFocus
                  value={value.name}
                  maxLength={80}
                  required
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Your first name"
                />
              </label>
              <label className="full-span">
                What role are you preparing for?
                <input
                  value={value.role}
                  maxLength={120}
                  required
                  minLength={2}
                  onChange={(e) => update("role", e.target.value)}
                  placeholder="e.g. Graduate Software Engineer"
                />
              </label>
              <label>
                Which company?
                <input
                  value={value.company}
                  maxLength={120}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Still exploring? Leave blank"
                />
              </label>
              <label>
                When is your interview?
                <input
                  type="date"
                  required
                  value={value.interview_date}
                  onChange={(e) => update("interview_date", e.target.value)}
                />
              </label>
              <div className="gentle-note full-span">
                <Sparkles size={18} />
                <span>
                  No fixed date yet? Choose a goal date. You can change it
                  whenever you need.
                </span>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="form-grid">
              <label>
                Where are you in your journey?
                <select
                  value={value.experience}
                  onChange={(e) => update("experience", e.target.value)}
                >
                  <option>Student / recent graduate</option>
                  <option>Career changer</option>
                  <option>Early career professional</option>
                  <option>Experienced professional</option>
                </select>
              </label>
              <label>
                Time for practice each day
                <select
                  value={value.minutes_per_day}
                  onChange={(e) =>
                    update("minutes_per_day", Number(e.target.value))
                  }
                >
                  {[15, 30, 45, 60, 90, 120].map((n) => (
                    <option key={n} value={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="full-span confidence-field">
                <legend>How are you feeling about interviews?</legend>
                <div className="confidence-options">
                  {[
                    "Very nervous",
                    "A little unsure",
                    "Somewhere in between",
                    "Quite confident",
                    "Ready for it",
                  ].map((text, i) => (
                    <button
                      type="button"
                      key={text}
                      className={value.confidence === i + 1 ? "selected" : ""}
                      onClick={() => update("confidence", i + 1)}
                      aria-pressed={value.confidence === i + 1}
                    >
                      <Heart
                        size={19}
                        fill={
                          value.confidence === i + 1 ? "currentColor" : "none"
                        }
                      />
                      <span>{text}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="full-span focus-field">
                <legend>Where would you like a little more support?</legend>
                <p>Choose at least one. You’re in charge of your focus.</p>
                <div className="focus-options">
                  {skillNames.map((skill) => (
                    <button
                      type="button"
                      key={skill}
                      aria-pressed={value.focus.includes(skill)}
                      className={value.focus.includes(skill) ? "selected" : ""}
                      onClick={() =>
                        update(
                          "focus",
                          value.focus.includes(skill)
                            ? value.focus.length > 1
                              ? value.focus.filter((s) => s !== skill)
                              : value.focus
                            : [...value.focus, skill],
                        )
                      }
                    >
                      {value.focus.includes(skill) && <Check size={14} />}
                      {skill}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          {step === 2 && (
            <div className="document-fields">
              {(["cv", "job_description"] as const).map((field) => (
                <div className="document-field" key={field}>
                  <div className="document-label">
                    <label htmlFor={field}>
                      <FileText size={17} />
                      {field === "cv" ? "Your CV" : "The job description"}
                      <small>Optional</small>
                    </label>
                    <label className="upload-button">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => {
                          void extract(e.target.files?.[0], field);
                          e.target.value = "";
                        }}
                        disabled={!!uploading}
                      />
                      {uploading === field ? (
                        <LoaderCircle className="spin" size={14} />
                      ) : (
                        <Upload size={14} />
                      )}
                      Upload file
                    </label>
                  </div>
                  <textarea
                    id={field}
                    value={value[field]}
                    maxLength={16000}
                    rows={4}
                    onChange={(e) => update(field, e.target.value)}
                    placeholder={
                      field === "cv"
                        ? "Paste your experience and projects, or upload a PDF, DOCX or TXT file…"
                        : "Paste the responsibilities and skills from the role…"
                    }
                  />
                  <small>
                    Review the extracted text before saving. Files are not
                    retained.
                  </small>
                </div>
              ))}
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={value.consent_ai}
                  disabled={!remote}
                  onChange={(e) => update("consent_ai", e.target.checked)}
                />
                <span>
                  Allow AI coaching to use my answers and verified CV / job
                  description text.
                  <small>
                    {remote
                      ? "Text is sent to the configured OpenAI or OpenRouter provider when you submit an answer or request a tailored question. Audio stays local to the server."
                      : "AI coaching requires the FastAPI server. The browser demo uses a local writing checklist."}
                  </small>
                </span>
              </label>
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-form-footer">
            <button
              type="button"
              className="text-button muted"
              onClick={() => (step ? setStep(step - 1) : onClose())}
            >
              {step ? "Back" : "Maybe later"}
            </button>
            <button className="button primary" disabled={busy || !!uploading}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} />
                  Creating your plan…
                </>
              ) : step === 2 ? (
                <>
                  <Sparkles size={16} />
                  Build my plan
                </>
              ) : (
                "Continue"
              )}
            </button>
          </div>
          {step === 2 && (
            <p className="save-note">
              Saving creates a new schedule. Your practice history stays with
              you.
            </p>
          )}
        </form>
        {step === 0 && (
          <div className="reset-area">
            {confirmReset ? (
              <>
                <p>
                  This deletes your plan, documents and practice history from
                  this workspace.
                </p>
                <button
                  className="text-button danger"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onReset();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  Yes, delete my workspace data
                </button>
                <button
                  className="text-button muted"
                  onClick={() => setConfirmReset(false)}
                >
                  Keep my data
                </button>
              </>
            ) : (
              <button
                className="text-button muted"
                onClick={() => setConfirmReset(true)}
              >
                <Trash2 size={13} />
                Reset workspace data
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
