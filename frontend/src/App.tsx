import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Brand } from "./components";
import { allQuestions, dateKey, initialWorkspace, makePlan } from "./data";
import { loadLocal, localFeedback, persist, request } from "./api";
import Dashboard from "./Dashboard";
import { PlanView, ProgressView, QuestionBank } from "./Views";
import Practice from "./Practice";
import Onboarding from "./Onboarding";
import type {
  Page,
  Profile,
  Question,
  Session,
  Task,
  Workspace,
} from "./types";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "My prep plan", icon: ClipboardList },
  { name: "Practice room", icon: MessageSquare },
  { name: "Question bank", icon: BookOpen },
  { name: "My progress", icon: ChartNoAxesCombined },
] as const;
const getPage = (): Page =>
  navigation.find(
    (n) =>
      n.name.toLowerCase().replaceAll(" ", "-") ===
      window.location.hash.slice(1),
  )?.name || "Overview";

export default function App() {
  const [data, setData] = useState<Workspace>(loadLocal);
  const [remote, setRemote] = useState(false);
  const [provider, setProvider] = useState("demo");
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>(getPage);
  const [setup, setSetup] = useState(false);
  const [guide, setGuide] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [practice, setPractice] = useState({
    id: "tell-me",
    task: undefined as string | undefined,
    assessment: false,
    key: 0,
  });
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    let mounted = true;
    request<Workspace & { provider: string }>("/workspace")
      .then((value) => {
        if (mounted) {
          setData(value);
          setRemote(true);
          setProvider(value.provider);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (ready && !remote) persist(data);
  }, [data, ready, remote]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const fn = () => setPage(getPage());
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    const modal = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    const selector =
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary";
    const first = modal.querySelector<HTMLElement>(selector);
    first?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSetup(false);
        setGuide(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...modal!.querySelectorAll<HTMLElement>(selector)].filter(
        (item) => item.offsetParent !== null,
      );
      if (!items.length) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && current <= 0) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && current === items.length - 1) {
        event.preventDefault();
        items[0].focus();
      }
    }
    document.addEventListener("keydown", trap);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [setup, guide]);
  function navigate(next: Page) {
    setPage(next);
    window.location.hash = next.toLowerCase().replaceAll(" ", "-");
    setMobile(false);
    setNotifications(false);
    window.scrollTo(0, 0);
    content.current?.focus({ preventScroll: true });
  }
  function start(id = "tell-me", task?: string, assessment = false) {
    setPractice({ id, task, assessment, key: Date.now() });
    navigate("Practice room");
  }
  const commit = (next: Workspace) => setData(next);
  async function toggleTask(task: Task) {
    try {
      commit(
        remote
          ? await request<Workspace>(`/tasks/${task.id}`, "PATCH", {
              completed: !task.completed,
            })
          : {
              ...data,
              tasks: data.tasks.map((t) =>
                t.id === task.id ? { ...t, completed: !t.completed } : t,
              ),
            },
      );
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  async function saveQuestion(id: string) {
    try {
      commit(
        remote
          ? await request<Workspace>(`/saved/${id}`, "POST")
          : {
              ...data,
              saved_questions: data.saved_questions.includes(id)
                ? data.saved_questions.filter((q) => q !== id)
                : [...data.saved_questions, id],
            },
      );
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  async function saveProfile(profile: Profile) {
    const next = remote
      ? await request<Workspace>("/profile", "PUT", profile)
      : {
          ...data,
          profile,
          onboarded: true,
          tasks: makePlan(profile, data.skills),
        };
    commit(next);
    setSetup(false);
    setToast("Your plan is ready. Let’s take it one day at a time.");
  }
  async function submitAnswer(
    id: string,
    answer: string,
    duration: number,
    task?: string,
    assessment = false,
    parent?: string,
  ): Promise<Session> {
    if (remote) {
      const result = await request<{ session: Session; workspace: Workspace }>(
        "/answers",
        "POST",
        {
          question_id: id,
          answer,
          duration_seconds: duration,
          task_id: task,
          assessment,
          parent_session_id: parent,
        },
      );
      commit(result.workspace);
      return result.session;
    }
    const questions = allQuestions(data);
    const session: Session = {
      id: crypto.randomUUID(),
      question_id: id,
      question: parent
        ? data.sessions.find((s) => s.id === parent)?.feedback.follow_up ||
          questions.find((q) => q.id === id)!.title
        : questions.find((q) => q.id === id)!.title,
      skill: questions.find((q) => q.id === id)!.skill,
      answer,
      duration_seconds: duration,
      created_at: new Date().toISOString(),
      feedback: localFeedback(answer),
      assessment,
    };
    commit({
      ...data,
      sessions: [session, ...data.sessions],
      tasks: data.tasks.map((t) =>
        t.id === task && t.question_id === id ? { ...t, completed: true } : t,
      ),
    });
    return session;
  }
  async function reviewSkill(skill: string, level: string) {
    try {
      let next: Workspace;
      if (remote)
        next = await request<Workspace>("/skills/review", "POST", {
          skill,
          level,
        });
      else {
        const focus = [...data.profile.focus];
        if (level === "Getting started" && !focus.includes(skill))
          focus.push(skill);
        if (
          level === "Feeling confident" &&
          focus.includes(skill) &&
          focus.length > 1
        )
          focus.splice(focus.indexOf(skill), 1);
        const profile = { ...data.profile, focus };
        const preserved = data.tasks.filter(
          (t) => t.date <= dateKey() || t.completed,
        );
        const dates = new Set(preserved.map((t) => t.date));
        next = {
          ...data,
          profile,
          skills: data.skills.map((s) =>
            s.name === skill ? { ...s, review: level } : s,
          ),
          tasks: [
            ...preserved,
            ...makePlan(profile, data.skills).filter(
              (t) => t.date > dateKey() && !dates.has(t.date),
            ),
          ],
        };
      }
      commit(next);
      setToast("Your perspective is saved and future tasks have been updated.");
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  async function reset() {
    commit(
      remote
        ? await request<Workspace>("/workspace", "DELETE")
        : initialWorkspace(),
    );
    setSetup(false);
    navigate("Overview");
    setToast("Your workspace has been reset. A fresh start.");
  }
  async function generateQuestion() {
    const result = await request<{ question: Question; workspace: Workspace }>(
      "/questions/generate",
      "POST",
    );
    commit(result.workspace);
    start(result.question.id);
  }
  const outstanding = data.tasks.filter(
    (t) => t.date === dateKey() && !t.completed,
  ).length;
  return (
    <div className="app-shell">
      {mobile && (
        <div className="sidebar-backdrop" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <button
          className="brand-button"
          onClick={() => navigate("Overview")}
          aria-label="Prepwise overview"
        >
          <Brand />
        </button>
        <button
          className="sidebar-close icon-button"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
              aria-current={page === name ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "My prep plan" && (
                <span className="nav-count">{outstanding}</span>
              )}
              {name === "Practice room" && <span className="nav-spark">✦</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-spark">✦</span>
            <h3>
              A little better.
              <br />
              Every single day.
            </h3>
            <p>
              Big opportunities start
              <br />
              with small steps.
            </p>
            <button onClick={() => setGuide(true)}>
              You’ve got this <span>♡</span>
            </button>
          </div>
          <button className="nav-item" onClick={() => setGuide(true)}>
            <CircleHelp size={18} />
            <span>Help & resources</span>
          </button>
          <div className="sidebar-divider" />
          <button className="profile-button" onClick={() => setSetup(true)}>
            <span className="avatar">
              {data.profile.name.charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>{data.profile.name}</strong>
              <small>Your personal workspace</small>
            </span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span>My workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate("Question bank");
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search practice questions"
                placeholder="Search anything…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) navigate("Question bank");
                }}
              />
              <kbd>⌕</kbd>
            </form>
            <div className="notification-wrap">
              <button
                className={`icon-button notification-button ${notifications ? "selected" : ""}`}
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {outstanding > 0 && <span />}
              </button>
              {notifications && (
                <div className="notification-popover">
                  <h3>A little nudge</h3>
                  <p>
                    {outstanding
                      ? `${outstanding} practice tasks are waiting for you today. There’s no need to do them all at once.`
                      : "You’re all caught up for today. Make a little time to reflect."}
                  </p>
                  <button
                    className="button primary small"
                    onClick={() => navigate("My prep plan")}
                  >
                    See today’s plan
                  </button>
                </div>
              )}
            </div>
            <button
              className="header-avatar"
              onClick={() => setSetup(true)}
              aria-label="Edit your profile"
            >
              {data.profile.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
        <main ref={content} tabIndex={-1} className="main-content">
          {!ready ? (
            <div className="loading-strip">
              <span className="spinner" /> Opening your workspace…
            </div>
          ) : !data.onboarded ? (
            <div className="setup-banner">
              <span>
                <Sparkles size={15} /> A starting point, made for you. Add your
                interview details for a personalised plan.
              </span>
              <button onClick={() => setSetup(true)}>
                Make it mine <ChevronDown size={14} />
              </button>
            </div>
          ) : null}
          {page === "Overview" && (
            <Dashboard
              data={data}
              navigate={navigate}
              onSetup={() => setSetup(true)}
              onStart={start}
              onToggle={toggleTask}
              onGuide={() => setGuide(true)}
            />
          )}
          {page === "My prep plan" && (
            <PlanView
              data={data}
              onStart={start}
              onToggle={toggleTask}
              onSetup={() => setSetup(true)}
            />
          )}
          {page === "Question bank" && (
            <QuestionBank
              data={data}
              search={search}
              setSearch={setSearch}
              onStart={start}
              onSave={saveQuestion}
              onGenerate={generateQuestion}
              canGenerate={
                remote && provider !== "demo" && data.profile.consent_ai
              }
            />
          )}
          {page === "Practice room" && (
            <Practice
              key={practice.key}
              questionId={practice.id}
              taskId={practice.task}
              assessment={practice.assessment}
              data={data}
              remote={remote}
              provider={provider}
              onSubmit={submitAnswer}
              onNext={start}
              onSetup={() => setSetup(true)}
              onBank={() => navigate("Question bank")}
            />
          )}
          {page === "My progress" && (
            <ProgressView data={data} onStart={start} onReview={reviewSkill} />
          )}
          <footer className="app-footer">
            <span>
              <ShieldCheck size={13} />
              {remote
                ? "Connected workspace · Progress saved on this server"
                : "Browser demo · Progress saved on this device"}
            </span>
            <span>Thoughtful practice. Lasting confidence.</span>
          </footer>
        </main>
      </div>
      {setup && (
        <Onboarding
          profile={data.profile}
          remote={remote}
          onClose={() => setSetup(false)}
          onSave={saveProfile}
          onReset={reset}
        />
      )}
      {guide && (
        <div className="modal-backdrop" onClick={() => setGuide(false)}>
          <section
            className="modal guide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              onClick={() => setGuide(false)}
              aria-label="Close guide"
            >
              <X size={20} />
            </button>
            <span className="large-icon">
              <BookOpen size={26} />
            </span>
            <div className="eyebrow">A FRAMEWORK, NOT A SCRIPT</div>
            <h2 id="guide-title">Give your story a little structure.</h2>
            <p>
              The STAR method helps you explain a real experience clearly. Aim
              for a short setup and spend most of your time on your actions.
            </p>
            <div className="star-grid">
              {[
                [
                  "S",
                  "Situation",
                  "What was happening? Set the scene in one or two sentences.",
                ],
                [
                  "T",
                  "Task",
                  "What needed to happen, and what was your responsibility?",
                ],
                [
                  "A",
                  "Action",
                  "What did you personally do? Explain a decision and why you made it.",
                ],
                [
                  "R",
                  "Result",
                  "What changed? Share a real outcome and something you learned.",
                ],
              ].map(([letter, title, text]) => (
                <div key={letter}>
                  <span>{letter}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="gentle-note">
              <Sparkles size={17} />A pause is a chance to think. Your story
              doesn’t have to sound memorised.
            </div>
            <button
              className="button primary full"
              onClick={() => {
                setGuide(false);
                start("team-conflict");
              }}
            >
              Put it into practice
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
