import { Check, CheckCheck } from "lucide-react";
import type { Message } from "../../../shared/schema";
export function MessageHistory({
  messages,
  language,
  viewer = "visitor",
}: {
  messages: Message[];
  language: "ar" | "en";
  viewer?: "visitor" | "operator";
}) {
  const ar = language === "ar";
  return (
    <div
      className="message-history"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label={ar ? "سجل المحادثة" : "Conversation history"}
    >
      {messages.map((message) => {
        const own =
          viewer === "visitor"
            ? message.sender === "visitor"
            : message.sender === "operator";
        return (
          <article
            className={`message-bubble ${own ? "message-bubble--own" : ""} ${message.sender === "assistant" ? "message-bubble--ai" : ""}`}
            key={message.id}
          >
            <small className="message-bubble__sender">
              {message.sender === "visitor"
                ? ar
                  ? "الزائر"
                  : "Visitor"
                : message.sender === "assistant"
                  ? ar
                    ? "مساعد الذكاء الاصطناعي"
                    : "AI assistant"
                  : message.operator_name ||
                    (ar ? "فريق مشروعك.net" : "Mashrouak.net team")}
            </small>
            <p dir="auto">{message.body}</p>
            <footer>
              <time
                dateTime={message.created_at}
                title={new Intl.DateTimeFormat(language, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(message.created_at))}
              >
                {new Intl.DateTimeFormat(language, {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(message.created_at))}
              </time>
              {own && (
                <span
                  className="message-receipt"
                  aria-label={
                    message.read_at
                      ? ar
                        ? "مقروءة"
                        : "Read"
                      : ar
                        ? "محفوظة على الخادم"
                        : "Saved on server"
                  }
                  title={
                    message.read_at
                      ? ar
                        ? "مقروءة"
                        : "Read"
                      : ar
                        ? "محفوظة على الخادم"
                        : "Saved on server"
                  }
                >
                  {message.read_at ? (
                    <CheckCheck size={14} />
                  ) : (
                    <Check size={14} />
                  )}
                </span>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
