import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  Lightbulb,
  MessageCircle,
  Play,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { dateKey, daysUntil, readableDate } from "./data";
import { Empty, Seedling, Tag, TaskRow } from "./components";
import type { Page, Task, Workspace } from "./types";

type Props = {
  data: Workspace;
  navigate: (page: Page) => void;
  onSetup: () => void;
  onStart: (id?: string, task?: string, assessment?: boolean) => void;
  onToggle: (task: Task) => void;
  onGuide: () => void;
};

export default function Dashboard({
  data,
  navigate,
  onSetup,
  onStart,
  onToggle,
  onGuide,
}: Props) {
  const today = data.tasks.filter((t) => t.date === dateKey());
  const complete = today.filter((t) => t.completed).length;
  const deadline = daysUntil(data.profile.interview_date);
  const totalMinutes = data.sessions.reduce(
    (sum, s) => sum + s.duration_seconds,
    0,
  );
  const practiceDates = new Set(
    data.sessions.map((s) => s.created_at.slice(0, 10)),
  );
  let streak = 0;
  const date = new Date();
  if (!practiceDates.has(dateKey(date))) date.setDate(date.getDate() - 1);
  while (practiceDates.has(dateKey(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  const firstTask = today.find((t) => !t.completed);
  const assessmentCount = new Set(
    data.sessions.filter((s) => s.assessment).map((s) => s.question_id),
  ).size;
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>
            Let’s make progress, {data.profile.name.split(" ")[0]}{" "}
            <span className="wave">✳</span>
          </h1>
          <p>A little practice today. A more confident you tomorrow.</p>
        </div>
        <button className="button secondary date-button" onClick={onSetup}>
          <CalendarDays size={16} />
          {new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </button>
      </div>
      <section className="welcome-card">
        <div className="welcome-copy">
          <Tag>
            <span className="tiny-spark">✦</span> BUILT AROUND YOU
          </Tag>
          <h2>
            Your potential.
            <br />A plan to unlock it.
          </h2>
          <p>
            You don’t need to have all the answers.
            <br className="desktop-break" /> Just a place to start, and a little
            practice.
          </p>
          <div className="welcome-actions">
            <button
              className="button primary"
              onClick={() => onStart(firstTask?.question_id, firstTask?.id)}
            >
              <Play size={15} fill="currentColor" />
              Let’s practise
            </button>
            <span>
              {data.profile.minutes_per_day} minutes a day is a great start
            </span>
          </div>
        </div>
        <Seedling />
        <div className="hero-caption">
          <span className="tiny-spark">✦</span> Small steps. Real growth.
        </div>
      </section>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon purple">
            <Target size={20} />
          </span>
          <div>
            <span className="stat-label">Today’s progress</span>
            <div className="stat-value">
              {complete}
              <span> / {today.length} tasks</span>
            </div>
          </div>
          <div className="mini-progress">
            <span
              style={{
                height: `${today.length ? (complete / today.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon orange">
            <Flame size={20} />
          </span>
          <div>
            <span className="stat-label">Practice streak</span>
            <div className="stat-value">
              {streak}
              <span> {streak === 1 ? "day" : "days"}</span>
            </div>
          </div>
          <span className="stat-note">One day at a time</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <Clock3 size={20} />
          </span>
          <div>
            <span className="stat-label">Time invested</span>
            <div className="stat-value">
              {Math.floor(totalMinutes / 60)}
              <span> min</span>
            </div>
          </div>
          <span className="stat-note">In your future self</span>
        </div>
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section className="panel today-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Your focus for today{" "}
                  <span className="count-pill">{today.length}</span>
                </h2>
                <p>Small, purposeful steps towards your next interview.</p>
              </div>
              <button
                className="text-button"
                onClick={() => navigate("My prep plan")}
              >
                View full plan <ChevronRight size={15} />
              </button>
            </div>
            <div className="task-list">
              {today.length ? (
                today.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onStart={() => onStart(task.question_id, task.id)}
                    onToggle={() => onToggle(task)}
                  />
                ))
              ) : (
                <Empty
                  title={
                    deadline < 0
                      ? "Your next chapter is waiting"
                      : "A little breathing room"
                  }
                  text={
                    deadline < 0
                      ? "Set a new interview goal to build your next preparation plan."
                      : "There are no tasks scheduled today. Pick a question to keep practising."
                  }
                >
                  <button
                    className="button secondary"
                    onClick={deadline < 0 ? onSetup : () => onStart()}
                  >
                    {deadline < 0 ? "Set a new goal" : "Choose a question"}
                  </button>
                </Empty>
              )}
            </div>
            <div className="panel-footnote">
              <Sparkles size={14} />
              {data.onboarded
                ? `Prioritising ${data.profile.focus
                    .slice(0, 2)
                    .map((s) => s.toLowerCase())
                    .join(" and ")}.`
                : "Your starting plan. Personalise it to make it yours."}
            </div>
          </section>
          <section className="panel skills-panel">
            <div className="panel-heading">
              <div>
                <h2>A little stronger, every session</h2>
                <p>Your skills grow with you. So does your plan.</p>
              </div>
              <button
                className="icon-button"
                aria-label="See progress and skill evidence"
                onClick={() => navigate("My progress")}
              >
                <CircleHelp size={18} />
              </button>
            </div>
            <div className="skill-snapshot">
              {data.skills.slice(0, 3).map((skill, i) => (
                <div className="snapshot-item" key={skill.name}>
                  <div
                    className={`snapshot-icon ${["purple", "blue", "green"][i]}`}
                  >
                    {i === 0 ? (
                      <MessageCircle size={18} />
                    ) : i === 1 ? (
                      <Lightbulb size={18} />
                    ) : (
                      <BookOpen size={18} />
                    )}
                  </div>
                  <span>{skill.name}</span>
                  <div className="skill-track">
                    <span style={{ width: `${skill.score}%` }} />
                  </div>
                  <span className="skill-state">
                    {skill.samples
                      ? `${skill.score}% · ${skill.samples} observation${skill.samples === 1 ? "" : "s"}`
                      : skill.review || "Ready to discover"}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="skill-bottom"
              onClick={() => onStart("tell-me", undefined, true)}
            >
              <span className="purple-text">
                <TrendingUp size={16} />
              </span>
              <span>
                {assessmentCount >= 5
                  ? "Keep practising to build a clearer picture of your strengths."
                  : "Find your starting point with a short, low-pressure assessment."}
              </span>
              <ChevronRight size={16} />
            </button>
          </section>
        </div>
        <aside className="dashboard-side">
          <section className="panel interview-card">
            <div className="section-label">
              <span className="stat-icon tiny purple">
                <CalendarDays size={16} />
              </span>
              YOUR NEXT INTERVIEW
            </div>
            <h3>{data.profile.company || "Your next opportunity"}</h3>
            <p>{data.profile.role}</p>
            <div className="countdown">
              <svg viewBox="0 0 140 140" aria-hidden="true">
                <circle
                  cx="70"
                  cy="70"
                  r="61"
                  fill="none"
                  stroke="#eeebf6"
                  strokeWidth="7"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="61"
                  fill="none"
                  stroke="#8a78d8"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray="383"
                  strokeDashoffset={
                    383 * Math.min(1, Math.max(0.07, deadline / 60))
                  }
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div>
                <strong>{Math.max(0, deadline)}</strong>
                <span>
                  {deadline < 0 ? "days since goal" : "days to get ready"}
                </span>
              </div>
            </div>
            <div className="interview-date">
              <CalendarDays size={14} />
              {readableDate(data.profile.interview_date, {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </div>
            <button className="button secondary full" onClick={onSetup}>
              Edit interview details
            </button>
          </section>
          <section className="tip-card">
            <span className="tip-icon">
              <Lightbulb size={19} />
            </span>
            <span className="section-label">A LITTLE REMINDER</span>
            <h3>
              You’re practising.
              <br />
              Not performing.
            </h3>
            <p>
              It’s okay to pause, think, and try again. That’s how confidence
              grows.
            </p>
            <button className="text-button" onClick={onGuide}>
              Try the STAR method <ChevronRight size={14} />
            </button>
            <span className="tip-decoration">✳</span>
          </section>
        </aside>
      </div>
      <div className="dashboard-bottom">
        <span>
          <Check size={14} /> Made for progress, at your pace.
        </span>
        <span>Your next opportunity starts with showing up.</span>
      </div>
    </>
  );
}
