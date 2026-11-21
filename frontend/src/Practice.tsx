import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  Mic,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { allQuestions } from "./data";
import { request } from "./api";
import { Tag } from "./components";
import type { Session, Workspace } from "./types";

const assessmentIds = [
  "tell-me",
  "duplicates",
  "queue",
  "binary-search",
  "team-conflict",
];
type Props = {
  questionId: string;
  taskId?: string;
  assessment: boolean;
  data: Workspace;
  remote: boolean;
  provider: string;
  onSubmit: (
    id: string,
    text: string,
    duration: number,
    task?: string,
    assessment?: boolean,
    parent?: string,
  ) => Promise<Session>;
  onNext: (id: string, task?: string, assessment?: boolean) => void;
  onSetup: () => void;
  onBank: () => void;
};
export default function Practice({
  questionId,
  taskId,
  assessment,
  data,
  remote,
  provider,
  onSubmit,
  onNext,
  onSetup,
  onBank,
}: Props) {
  const answered = new Set(
    data.sessions.filter((s) => s.assessment).map((s) => s.question_id),
  );
  const initialQuestion = assessment
    ? assessmentIds.find((id) => !answered.has(id)) || "tell-me"
    : questionId;
  const [activeId] = useState(initialQuestion);
  const questions = allQuestions(data);
  const question = questions.find((q) => q.id === activeId) || questions[0];
  const draftKey = `prepwise.draft.${question.id}.${assessment ? "assessment" : "practice"}`;
  const [answer, setAnswer] = useState(() => {
    try {
      return sessionStorage.getItem(draftKey) || "";
    } catch {
      return "";
    }
  });
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState(false);
  const [guide, setGuide] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [parent, setParent] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("type");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptStats, setTranscriptStats] = useState("");
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const mounted = useRef(true);
  const [spoken, setSpoken] = useState(false);
  const ai = remote && provider !== "demo" && data.profile.consent_ai;
  useEffect(() => {
    if (paused || session || busy) return;
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [paused, session, busy]);
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, answer);
    } catch {
      /* Draft remains in memory. */
    }
  }, [answer, draftKey]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (media.current?.state === "recording") media.current.stop();
      media.current?.stream.getTracks().forEach((t) => t.stop());
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  async function finish() {
    if (recording || transcribing) return;
    setBusy(true);
    setError("");
    try {
      const result = await onSubmit(
        question.id,
        answer,
        elapsed,
        taskId,
        assessment && !parent,
        parent?.id,
      );
      setSession(result);
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* No storage. */
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function record() {
    if (recording) {
      media.current?.stop();
      setRecording(false);
      return;
    }
    if (!remote) {
      setError(
        "Local voice transcription needs the FastAPI server and optional Whisper setup. You can always type your answer.",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(
        "Recording is not supported in this browser. Please type your answer instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      media.current = recorder;
      chunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        setRecording(false);
        setTranscribing(true);
        try {
          const body = new FormData();
          body.append(
            "file",
            new Blob(chunks.current, { type: recorder.mimeType }),
            "practice.webm",
          );
          const result = await request<{
            text: string;
            filler_count: number;
            fillers_per_minute: number;
            pauses: unknown[];
          }>("/transcribe", "POST", body);
          if (mounted.current) {
            setAnswer((v) => `${v}${v ? "\n\n" : ""}${result.text}`);
            setTranscriptStats(
              `Estimated ${result.fillers_per_minute} fillers / minute · ${result.pauses.length} longer pauses. These estimates don’t affect your feedback.`,
            );
          }
        } catch (e) {
          if (mounted.current) setError((e as Error).message);
        } finally {
          if (mounted.current) setTranscribing(false);
        }
      };
      recorder.start();
      setRecording(true);
      setPaused(false);
      setError("");
    } catch {
      setError(
        "Microphone access was unavailable. You can type your answer or allow microphone access in your browser.",
      );
    }
  }
  function readQuestion() {
    if (!("speechSynthesis" in window)) {
      setError("Read-aloud is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(
      parent?.feedback.follow_up || question.title,
    );
    speech.lang = "en-GB";
    speech.rate = 0.9;
    speech.onend = () => setSpoken(false);
    setSpoken(true);
    window.speechSynthesis.speak(speech);
  }
  const position = assessmentIds.indexOf(question.id) + 1;
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">YOUR SPACE TO TRY</div>
          <h1>
            {assessment
              ? "Let’s find your starting point."
              : "Confidence starts with a conversation."}
          </h1>
          <p>
            {assessment
              ? "Five short questions across communication, reasoning and fundamentals. No pass or fail."
              : "Think out loud. Take a breath. Make the answer your own."}
          </p>
        </div>
        <button className="button secondary" onClick={onBank}>
          <BookOpen size={16} />
          Browse questions
        </button>
      </div>
      <div className="practice-layout">
        <section className="practice-main">
          <div className="practice-session-bar">
            <span>
              <span className="session-dot" />
              {assessment
                ? `Starting point · Question ${position} of 5`
                : parent
                  ? "A thoughtful follow-up"
                  : "A little intentional practice"}
            </span>
            <span>
              <ShieldCheck size={14} />
              No pressure. Just practice.
            </span>
          </div>
          <article className="panel practice-card">
            <div className="coach-identity">
              <span className="coach-avatar">
                <Sparkles size={21} />
              </span>
              <div>
                <strong>Your practice coach</strong>
                <small>
                  {ai
                    ? `${provider === "openrouter" ? "OpenRouter" : "OpenAI"} coaching`
                    : "Offline practice · writing checklist"}
                </small>
              </div>
              <button
                className={`icon-button ${spoken ? "selected" : ""}`}
                aria-label="Read question aloud"
                onClick={readQuestion}
              >
                <Volume2 size={19} />
              </button>
            </div>
            <div className="question-content">
              <Tag tone={question.category === "Technical" ? "blue" : "purple"}>
                {question.category}
              </Tag>
              <h2>{parent?.feedback.follow_up || question.title}</h2>
              <p>
                {parent
                  ? "Build on your previous answer. A concrete example can make your reasoning clearer."
                  : question.description}
              </p>
              {!session && (
                <button
                  className="hint-button"
                  onClick={() => setHint(!hint)}
                  aria-expanded={hint}
                >
                  <Lightbulb size={15} />
                  {hint ? "Hide a little nudge" : "Need a little nudge?"}
                </button>
              )}
              {hint && !session && (
                <div className="hint-content">{question.hint}</div>
              )}
            </div>
            {!session ? (
              <div className="answer-area">
                <div className="answer-toolbar">
                  <div className="answer-mode">
                    <button
                      className={mode === "type" ? "active" : ""}
                      onClick={() => setMode("type")}
                    >
                      <MessageCircle size={14} />
                      Type your answer
                    </button>
                    <button
                      className={mode === "speak" ? "active" : ""}
                      onClick={() => setMode("speak")}
                    >
                      <Mic size={14} />
                      Speak
                    </button>
                  </div>
                  <button
                    className="timer"
                    onClick={() => setPaused(!paused)}
                    aria-label={
                      paused ? "Resume practice timer" : "Pause practice timer"
                    }
                    disabled={recording}
                  >
                    {paused ? <Play size={13} /> : <Pause size={13} />}{" "}
                    {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                    {String(elapsed % 60).padStart(2, "0")}
                  </button>
                </div>
                {mode === "speak" && (
                  <div className="voice-panel">
                    <button
                      className={`record-button ${recording ? "recording" : ""}`}
                      onClick={record}
                      disabled={transcribing}
                    >
                      {transcribing ? (
                        <LoaderCircle className="spin" size={22} />
                      ) : recording ? (
                        <Square size={22} fill="currentColor" />
                      ) : (
                        <Mic size={24} />
                      )}
                    </button>
                    <div>
                      <strong>
                        {transcribing
                          ? "Transcribing on your server…"
                          : recording
                            ? "Take your time. We’re listening."
                            : "Your voice, your pace."}
                      </strong>
                      <p>
                        {recording
                          ? "Tap stop when you’re ready. You can edit the transcript."
                          : "Tap the microphone to record. Optional local Whisper setup required."}
                      </p>
                    </div>
                  </div>
                )}
                <label className="sr-only" htmlFor="practice-answer">
                  Your answer
                </label>
                <textarea
                  id="practice-answer"
                  className="answer-input"
                  value={answer}
                  maxLength={12000}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    question.category === "Technical"
                      ? "Start by clarifying the problem. Walk through your approach, trade-offs and a small example…"
                      : "Start wherever feels natural. This is a space to practise, not to be perfect…"
                  }
                  disabled={busy}
                />
                {transcriptStats && (
                  <p className="transcript-note">
                    {transcriptStats} Review your transcript before sharing.
                  </p>
                )}
                <div className="answer-bottom">
                  <span>
                    {words} words <span>·</span> Draft saved in this browser tab
                  </span>
                  <span>{question.minutes} min suggested</span>
                </div>
                {error && (
                  <div className="form-error" role="alert">
                    {error}
                  </div>
                )}
                <div className="answer-actions">
                  <span>
                    <ShieldCheck size={14} />
                    {ai
                      ? "Sent to your AI coach when you submit"
                      : "A private moment to find your words"}
                  </span>
                  <button
                    className="button primary"
                    onClick={finish}
                    disabled={
                      busy ||
                      answer.trim().length < 10 ||
                      recording ||
                      transcribing
                    }
                  >
                    {busy ? (
                      <>
                        <LoaderCircle size={16} className="spin" />
                        Reflecting on your answer…
                      </>
                    ) : (
                      <>
                        <CheckCheck size={17} />
                        Finish & reflect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="feedback-area">
                <div className="feedback-title">
                  <span className="feedback-check">
                    <Check size={20} />
                  </span>
                  <div>
                    <h3>You showed up. That’s a step forward.</h3>
                    <p>
                      {session.feedback.source === "ai"
                        ? "Provisional AI coaching · Review what feels useful to you"
                        : "Offline writing checklist · Technical correctness is not assessed"}
                    </p>
                  </div>
                </div>
                <p className="feedback-summary">{session.feedback.summary}</p>
                <div className="feedback-columns">
                  <div>
                    <h4>
                      <Sparkles size={16} />
                      Keep building on
                    </h4>
                    <ul>
                      {session.feedback.strengths.slice(0, 3).map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>
                      <Lightbulb size={16} />
                      Try next time
                    </h4>
                    <ul>
                      {session.feedback.improvements.slice(0, 3).map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {session.feedback.evidence && (
                  <blockquote>
                    “{session.feedback.evidence}”<small>From your answer</small>
                  </blockquote>
                )}
                <details className="your-answer">
                  <summary>Revisit your answer</summary>
                  <p>{session.answer}</p>
                </details>
                <div className="followup-card">
                  <span className="eyebrow">LET’S GO A LITTLE DEEPER</span>
                  <h3>{session.feedback.follow_up}</h3>
                  <button
                    className="text-button"
                    onClick={() => {
                      setParent(session);
                      setSession(null);
                      setAnswer("");
                      setElapsed(0);
                      setError("");
                    }}
                  >
                    Practise this follow-up <ChevronRight size={14} />
                  </button>
                </div>
                <button
                  className="guide-toggle"
                  onClick={() => setGuide(!guide)}
                >
                  <BookOpen size={16} />
                  {guide
                    ? "Hide the answer framework"
                    : "Explore an answer framework"}
                  <ChevronRight size={15} />
                </button>
                {guide && (
                  <div className="hint-content answer-framework">
                    {question.guide}
                    <p>
                      Use this to check your thinking, then explain it in your
                      own words.
                    </p>
                  </div>
                )}
                <div className="feedback-actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSession(null);
                      setParent(null);
                      setAnswer("");
                      setElapsed(0);
                      setError("");
                    }}
                  >
                    <RotateCcw size={15} />
                    Try again
                  </button>
                  {assessment && answered.size < 5 ? (
                    <button
                      className="button primary"
                      onClick={() =>
                        onNext(
                          assessmentIds.find((id) => !answered.has(id)) ||
                            "tell-me",
                          undefined,
                          true,
                        )
                      }
                    >
                      Next assessment question
                    </button>
                  ) : (
                    <button className="button primary" onClick={onBank}>
                      {assessment
                        ? "Assessment complete · Keep exploring"
                        : "Find my next question"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        </section>
        <aside className="practice-aside">
          <section className="panel practice-intention">
            <span className="large-icon">
              <Lightbulb size={23} />
            </span>
            <h2>A little intention goes a long way.</h2>
            <div className="intention-item">
              <span>01</span>
              <div>
                <h3>Make space to think</h3>
                <p>A short pause is part of a thoughtful answer.</p>
              </div>
            </div>
            <div className="intention-item">
              <span>02</span>
              <div>
                <h3>Show your thinking</h3>
                <p>Explain the “why” behind a choice. Your process matters.</p>
              </div>
            </div>
            <div className="intention-item">
              <span>03</span>
              <div>
                <h3>Use your own experience</h3>
                <p>A small, specific example beats a memorised script.</p>
              </div>
            </div>
          </section>
          <section className="context-card">
            <span className="section-label">
              <Sparkles size={15} />
              YOUR PRACTICE CONTEXT
            </span>
            <h3>{data.profile.role}</h3>
            <p>
              {data.profile.cv
                ? "Your verified CV text gives your AI coach context for your project stories."
                : "Add a CV to give your AI coach context for your project stories."}
            </p>
            <div className="context-tags">
              <Tag tone={data.profile.cv ? "green" : "neutral"}>
                {data.profile.cv ? "CV context ready" : "CV optional"}
              </Tag>
              <Tag tone={data.profile.job_description ? "green" : "neutral"}>
                {data.profile.job_description
                  ? "Role context ready"
                  : "Job description optional"}
              </Tag>
            </div>
            <button className="text-button" onClick={onSetup}>
              Update my context
            </button>
          </section>
          {!ai && (
            <div className="offline-note">
              <ShieldCheck size={16} />
              <p>
                {remote && provider !== "demo"
                  ? "AI text sharing is off. Enable it in your profile to get contextual coaching."
                  : "This workspace uses an offline writing checklist. Connect an AI provider on the server for contextual coaching."}
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
