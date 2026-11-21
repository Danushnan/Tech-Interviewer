import {
  Check,
  CheckCheck,
  Clock3,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import type { Question, Task } from "./types";
import { useEffect } from "react";

export function useJournalDialog(active: boolean, close: () => void) {
  useEffect(() => {
    if (!active) return;
    const modal = document.querySelector<HTMLElement>(".journal-modal");
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    modal.querySelector<HTMLElement>("button")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const buttons = [...modal!.querySelectorAll<HTMLElement>("button")];
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
        event.preventDefault();
        buttons[0]?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus({ preventScroll: true });
    };
  }, [active, close]);
}

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <span className="brand-mark">
        <Sparkles size={22} strokeWidth={1.8} />
      </span>
      {!small && (
        <span>
          prepwise<span className="brand-period">.</span>
        </span>
      )}
    </div>
  );
}
export function Tag({
  children,
  tone = "purple",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Sparkles size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function TaskRow({
  task,
  onStart,
  onToggle,
}: {
  task: Task;
  onStart: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`task-row ${task.completed ? "is-done" : ""}`}>
      <button
        className={`task-check ${task.completed ? "checked" : ""}`}
        aria-label={`${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`}
        onClick={onToggle}
      >
        {task.completed && <Check size={14} />}
      </button>
      <span
        className={`task-type ${task.category === "Technical" ? "blue" : "purple"}`}
      >
        <MessageCircle size={19} />
      </span>
      <div className="task-copy">
        <h3>{task.title}</h3>
        <div className="task-meta">
          <span>{task.category}</span>
          <span className="meta-dot">·</span>
          <Clock3 size={12} />
          <span>{task.minutes} min</span>
        </div>
      </div>
      {task.completed ? (
        <span className="done-label">
          <CheckCheck size={15} /> Completed
        </span>
      ) : (
        <button className="button small secondary" onClick={onStart}>
          Practise
        </button>
      )}
    </div>
  );
}
export function Seedling() {
  return (
    <svg
      className="seedling"
      viewBox="0 0 280 220"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="146" cy="199" rx="89" ry="9" fill="#D5CFED" opacity=".5" />
      <path
        d="M83 142h113l-12 46a15 15 0 0 1-15 11h-59a15 15 0 0 1-15-11z"
        fill="#B6A4E2"
      />
      <path d="M83 142h113v14H83z" fill="#C6B6ED" />
      <path
        d="M141 145V69"
        stroke="#625087"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M140 113c-42 2-64-17-64-49 37-3 63 13 64 49" fill="#9B8AC9" />
      <path d="M142 88c-1-38 23-61 60-59 1 37-23 59-60 59" fill="#756398" />
      <path d="M139 128c-26-1-42-15-43-36 25 0 43 13 43 36" fill="#756398" />
      <path d="M143 123c29 1 48-14 49-39-28 0-48 15-49 39" fill="#B09CCF" />
      <path
        d="m88 75 50 36m56-70-50 44m37 9-36 27"
        stroke="#F0E9FC"
        strokeOpacity=".45"
        strokeWidth="1.5"
      />
      <rect
        x="211"
        y="112"
        width="36"
        height="42"
        rx="7"
        fill="#fff"
        transform="rotate(10 211 112)"
      />
      <path
        d="m220 132 5 5 10-12"
        stroke="#8A73BB"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m60 35 2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill="#A38BCC" />
      <circle cx="229" cy="65" r="4" fill="#D1B96F" />
      <circle cx="56" cy="143" r="3" fill="#B2A0D6" />
      <path
        d="m204 183 4 6m-150-91 5 2"
        stroke="#A58DBB"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function QuestionCard({
  question,
  saved,
  onSave,
  onStart,
}: {
  question: Question;
  saved: boolean;
  onSave: () => void;
  onStart: () => void;
}) {
  return (
    <article className="question-card">
      <div className="question-card-top">
        <Tag tone={question.category === "Technical" ? "blue" : "purple"}>
          {question.category}
        </Tag>
        <button
          className={`bookmark ${saved ? "saved" : ""}`}
          onClick={onSave}
          aria-label={`${saved ? "Unsave" : "Save"} ${question.title}`}
        >
          <svg
            width="18"
            height="20"
            viewBox="0 0 18 20"
            fill={saved ? "currentColor" : "none"}
          >
            <path
              d="M4 2h10v16l-5-3-5 3z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <h3>{question.title}</h3>
      <p>{question.description}</p>
      <div className="question-card-bottom">
        <span>
          <Clock3 size={14} />
          {question.minutes} min <span>·</span> {question.difficulty}
        </span>
        <button className="text-button" onClick={onStart}>
          Practise
        </button>
      </div>
    </article>
  );
}
