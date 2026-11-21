import { useState } from "react";
import {
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  LoaderCircle,
  MessageCircle,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { allQuestions, dateKey, daysUntil, readableDate } from "./data";
import {
  Empty,
  QuestionCard,
  Tag,
  TaskRow,
  useJournalDialog,
} from "./components";
import type { Session, Task, Workspace } from "./types";

export function PlanView({
  data,
  onStart,
  onToggle,
  onSetup,
}: {
  data: Workspace;
  onStart: (id: string, task?: string) => void;
  onToggle: (task: Task) => void;
  onSetup: () => void;
}) {
  const [week, setWeek] = useState(0);
  const dates = [...new Set(data.tasks.map((t) => t.date))].sort();
  const [selected, setSelected] = useState(
    dates.includes(dateKey()) ? dateKey() : dates[0],
  );
  const weeks = Math.max(1, Math.ceil(dates.length / 7));
  const days = dates.slice(week * 7, week * 7 + 7);
  const tasks = data.tasks.filter((t) => t.date === selected);
  const completed = data.tasks.filter((t) => t.completed).length;
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">ONE DAY AT A TIME</div>
          <h1>A plan with your name on it.</h1>
          <p>A little structure for the journey ahead. You set the pace.</p>
        </div>
        <button className="button secondary" onClick={onSetup}>
          <CalendarDays size={16} />
          Adjust my plan
        </button>
      </div>
      <div className="plan-summary">
        <div className="plan-summary-icon">
          <Target size={28} />
        </div>
        <div>
          <Tag>{data.profile.role}</Tag>
          <h2>
            {Math.max(0, daysUntil(data.profile.interview_date))} days to build
            your confidence.
          </h2>
          <p>
            {data.profile.minutes_per_day} minutes a day ·{" "}
            {data.profile.company || "Your next opportunity"} · Interview on{" "}
            {readableDate(data.profile.interview_date)}
          </p>
        </div>
        <div className="plan-completion">
          <strong>
            {data.tasks.length
              ? Math.round((completed / data.tasks.length) * 100)
              : 0}
            %
          </strong>
          <span>of your plan complete</span>
          <div className="skill-track">
            <span
              style={{
                width: `${data.tasks.length ? (completed / data.tasks.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="plan-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Your preparation calendar</h2>
              <p>Practice, reflect, repeat. Every session counts.</p>
            </div>
            <div className="week-controls">
              <button
                className="icon-button"
                aria-label="Previous week"
                disabled={week === 0}
                onClick={() => {
                  setWeek(week - 1);
                  setSelected(dates[(week - 1) * 7]);
                }}
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                Week {week + 1} of {weeks}
              </span>
              <button
                className="icon-button"
                aria-label="Next week"
                disabled={week + 1 >= weeks}
                onClick={() => {
                  setWeek(week + 1);
                  setSelected(dates[(week + 1) * 7]);
                }}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          <div className="calendar-strip">
            {days.map((date) => {
              const dayTasks = data.tasks.filter((t) => t.date === date);
              const done = dayTasks.every((t) => t.completed);
              return (
                <button
                  key={date}
                  className={`calendar-day ${selected === date ? "selected" : ""} ${done ? "complete" : ""}`}
                  onClick={() => setSelected(date)}
                >
                  <small>{readableDate(date, { weekday: "short" })}</small>
                  <strong>{new Date(`${date}T12:00:00`).getDate()}</strong>
                  <span>
                    {done ? (
                      <Check size={13} />
                    ) : date === dateKey() ? (
                      "Today"
                    ) : (
                      `${dayTasks.length} tasks`
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="selected-day-heading">
            <h3>
              {selected
                ? readableDate(selected, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "No scheduled tasks"}
            </h3>
            <span>
              <Clock3 size={14} />
              {tasks.reduce((n, t) => n + t.minutes, 0)} min with reflection
            </span>
          </div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onStart={() => onStart(task.question_id, task.id)}
              onToggle={() => onToggle(task)}
            />
          ))}
          {!tasks.length && (
            <Empty
              title="A fresh plan is a good start"
              text="Update your interview goal to schedule your next steps."
            >
              <button className="button primary" onClick={onSetup}>
                Set my goal
              </button>
            </Empty>
          )}
        </section>
        <aside className="panel plan-why">
          <span className="large-icon">
            <Sparkles size={24} />
          </span>
          <h2>Why this plan?</h2>
          <p>A plan should make sense to you.</p>
          <ul>
            <li>
              Your deadline gives us{" "}
              {Math.max(1, daysUntil(data.profile.interview_date))} preparation
              days.
            </li>
            <li>
              Your chosen focus:{" "}
              {data.profile.focus.map((s) => s.toLowerCase()).join(", ")}.
            </li>
            <li>
              Tasks fit your daily time budget, including a few minutes to
              reflect.
            </li>
          </ul>
          <div className="gentle-note">
            AI coaching observations can adapt future days. You can change your
            priorities in My progress.
          </div>
          <button className="text-button" onClick={onSetup}>
            Change what matters to me
          </button>
        </aside>
      </div>
    </>
  );
}

export function QuestionBank({
  data,
  search,
  setSearch,
  onStart,
  onSave,
  onGenerate,
  canGenerate,
}: {
  data: Workspace;
  search: string;
  setSearch: (search: string) => void;
  onStart: (id: string) => void;
  onSave: (id: string) => void;
  onGenerate: () => Promise<void>;
  canGenerate: boolean;
}) {
  const [category, setCategory] = useState("All questions");
  const [difficulty, setDifficulty] = useState("All levels");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const questions = allQuestions(data);
  const filtered = questions.filter(
    (q) =>
      (category === "All questions" ||
        category === q.category ||
        (category === "Saved" && data.saved_questions.includes(q.id))) &&
      (difficulty === "All levels" || difficulty === q.difficulty) &&
      `${q.title} ${q.description} ${q.skill}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">CURIOSITY LOOKS GOOD ON YOU</div>
          <h1>Good questions. Better preparation.</h1>
          <p>
            A space to think out loud, try things out, and find your own
            answers.
          </p>
        </div>
        <span className="soft-label">
          <BookIcon />
          {questions.length} questions, always open
        </span>
      </div>
      <div className="tailor-banner">
        <span>
          <Sparkles size={17} />
          {canGenerate
            ? "Create a question using your verified CV and target role."
            : "Connect an AI provider and enable text sharing to create questions from your CV and role."}
        </span>
        <button
          className="button secondary small"
          disabled={!canGenerate || generating}
          onClick={async () => {
            setError("");
            setGenerating(true);
            try {
              await onGenerate();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setGenerating(false);
            }
          }}
        >
          {generating ? (
            <LoaderCircle size={14} className="spin" />
          ) : (
            <Sparkles size={14} />
          )}
          Create a tailored question
        </button>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="bank-toolbar">
        <div className="tabs" role="tablist" aria-label="Question category">
          {[
            "All questions",
            "Behavioural",
            "Technical",
            "CV & projects",
            "Saved",
          ].map((value) => (
            <button
              role="tab"
              aria-selected={category === value}
              key={value}
              className={category === value ? "active" : ""}
              onClick={() => setCategory(value)}
            >
              {value === "Saved" && <Bookmark size={14} />} {value}
            </button>
          ))}
        </div>
        <label className="level-select">
          <Filter size={14} />
          <select
            aria-label="Question difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {["All levels", "Starter", "Intermediate", "Stretch"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
      </div>
      <div className="bank-search">
        <Search size={19} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a question, skill or topic…"
          aria-label="Filter question bank"
        />
        <span>{filtered.length} questions</span>
      </div>
      <div className="question-grid">
        {filtered.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            saved={data.saved_questions.includes(question.id)}
            onSave={() => onSave(question.id)}
            onStart={() => onStart(question.id)}
          />
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="A fresh search might help"
          text="Try a different topic, category or level."
        >
          <button
            className="button secondary"
            onClick={() => {
              setSearch("");
              setCategory("All questions");
              setDifficulty("All levels");
            }}
          >
            Clear filters
          </button>
        </Empty>
      )}
      <div className="gentle-note bank-note">
        <Sparkles size={17} />
        These are general preparation questions, not predictions about a
        company’s interview. Answer guides become available after you try.
      </div>
    </>
  );
}
function BookIcon() {
  return <MessageCircle size={15} />;
}

export function ProgressView({
  data,
  onStart,
  onReview,
}: {
  data: Workspace;
  onStart: (id: string, task?: string, assessment?: boolean) => void;
  onReview: (skill: string, level: string) => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  useJournalDialog(Boolean(session), () => setSession(null));
  const [editing, setEditing] = useState("");
  const assessment = new Set(
    data.sessions.filter((s) => s.assessment).map((s) => s.question_id),
  ).size;
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 13 + i);
    const key = dateKey(date);
    return {
      key,
      count: data.sessions.filter((s) => s.created_at.slice(0, 10) === key)
        .length,
    };
  });
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">LOOK HOW FAR YOU’RE GOING</div>
          <h1>Progress is a practice.</h1>
          <p>Every attempt is evidence that you’re showing up for yourself.</p>
        </div>
        <button
          className="button primary"
          onClick={() => onStart("tell-me", undefined, true)}
        >
          <Sparkles size={16} />
          {assessment ? "Continue assessment" : "Find my starting point"}
        </button>
      </div>
      <div className="progress-top">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Showing up adds up</h2>
              <p>Your practice over the last two weeks.</p>
            </div>
            <Tag tone="green">{data.sessions.length} sessions</Tag>
          </div>
          <div className="activity-chart">
            {days.map((day) => (
              <div
                key={day.key}
                className="activity-day"
                title={`${readableDate(day.key)}: ${day.count} sessions`}
              >
                <span>{day.count || ""}</span>
                <div
                  style={{ height: `${Math.min(100, 10 + day.count * 22)}%` }}
                  className={day.count ? "has-activity" : ""}
                />
                <small>{new Date(`${day.key}T12:00:00`).getDate()}</small>
              </div>
            ))}
          </div>
          <div className="chart-caption">
            <span>{readableDate(days[0].key)}</span>
            <span>Today</span>
          </div>
        </section>
        <section className="assessment-progress">
          <span className="large-icon">
            <Target size={25} />
          </span>
          <h2>Your starting point</h2>
          <p>Five short questions. A clearer picture of where to focus.</p>
          <div className="assessment-dots">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={assessment > i ? "filled" : ""}>
                {assessment > i && <Check size={13} />}
              </span>
            ))}
          </div>
          <span>{Math.min(5, assessment)} of 5 completed</span>
          <button
            className="text-button"
            onClick={() => onStart("tell-me", undefined, true)}
          >
            {assessment >= 5 ? "Practise again" : "Continue at your pace"}{" "}
            <ChevronRight size={15} />
          </button>
        </section>
      </div>
      <section className="panel skill-detail-panel">
        <div className="panel-heading">
          <div>
            <h2>Your skills, with context</h2>
            <p>
              Coaching observations are a starting point. Your perspective
              matters too.
            </p>
          </div>
          <Tag>Always a work in progress</Tag>
        </div>
        {data.skills.map((skill) => (
          <div className="skill-detail" key={skill.name}>
            <span className="skill-detail-icon">
              <Sparkles size={19} />
            </span>
            <div className="skill-detail-main">
              <h3>{skill.name}</h3>
              <span>
                {skill.samples
                  ? `${skill.samples} AI coaching observation${skill.samples === 1 ? "" : "s"} · ${skill.score}% provisional rubric average`
                  : "No AI coaching observations yet"}
                {skill.review && ` · You feel: ${skill.review.toLowerCase()}`}
              </span>
              <div className="skill-track">
                <span style={{ width: `${skill.score}%` }} />
              </div>
            </div>
            {editing === skill.name ? (
              <select
                aria-label={`Your confidence in ${skill.name}`}
                autoFocus
                defaultValue=""
                onBlur={() => setEditing("")}
                onChange={(e) => {
                  if (e.target.value) {
                    onReview(skill.name, e.target.value);
                    setEditing("");
                  }
                }}
              >
                <option value="" disabled>
                  How do you feel?
                </option>
                {[
                  "Getting started",
                  "Building confidence",
                  "Feeling confident",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ) : (
              <button
                className="text-button"
                onClick={() => setEditing(skill.name)}
              >
                Add my perspective
              </button>
            )}
          </div>
        ))}
        <div className="panel-footnote">
          <Sparkles size={14} />
          Offline checklist observations don’t become skill scores. Accent,
          pauses and filler words never affect scores.
        </div>
      </section>
      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <h2>Your practice journal</h2>
            <p>Revisit an answer, notice a pattern, celebrate a small win.</p>
          </div>
        </div>
        {data.sessions.length ? (
          data.sessions.map((s) => (
            <button
              className="history-row"
              key={s.id}
              onClick={() => setSession(s)}
            >
              <span className="task-type purple">
                <MessageCircle size={18} />
              </span>
              <span>
                <strong>{s.question}</strong>
                <small>
                  {new Date(s.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {s.skill} ·{" "}
                  {s.feedback.source === "ai"
                    ? "AI coaching"
                    : "Offline checklist"}
                </small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))
        ) : (
          <Empty
            title="Your first attempt belongs here"
            text="Start with one question. You can take as much time as you need."
          >
            <button
              className="button secondary"
              onClick={() => onStart("tell-me")}
            >
              Try your first question
            </button>
          </Empty>
        )}
      </section>
      {session && (
        <div className="modal-backdrop" onClick={() => setSession(null)}>
          <section
            className="modal journal-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Practice journal entry"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              onClick={() => setSession(null)}
              aria-label="Close journal entry"
            >
              ×
            </button>
            <Tag>{session.skill}</Tag>
            <h2>{session.question}</h2>
            <h3>Your answer</h3>
            <p className="answer-quote">{session.answer}</p>
            <h3>
              {session.feedback.source === "ai"
                ? "AI coaching"
                : "Offline writing checklist"}
            </h3>
            <p>{session.feedback.summary}</p>
            <ul className="feedback-list">
              {session.feedback.improvements.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
            <button
              className="button primary"
              onClick={() => {
                setSession(null);
                onStart(session.question_id);
              }}
            >
              Try this question again
            </button>
          </section>
        </div>
      )}
    </>
  );
}
