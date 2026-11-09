import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  ShieldCheck,
  MessageSquare,
  RotateCw,
  UserRound,
  Sparkles,
} from "lucide-react";
import type { Conversation, Message } from "../../../shared/schema";
import { useLocale, useTheme } from "../../app/providers/preferences-context";
import { usePlatform, useSettings } from "../../app/providers/content-context";
import { Logo } from "../../components/shared/Logo";
import {
  LanguageToggle,
  ThemeToggle,
} from "../../components/shared/PreferenceControls";
import { MessageHistory } from "../../components/shared/MessageHistory";
import { api, ApiError } from "../../lib/platform-api";
import { useSEO } from "../../lib/seo";
import {
  SkeletonChatHistory,
  SkeletonRegion,
} from "../../../shared/ui/Skeleton";
import { BusyInline, ResourceError } from "../../../shared/ui/ResourceError";

export function ChatPage({
  initialConversation,
  initialMessages,
}: {
  initialConversation: Conversation | null;
  initialMessages: Message[];
}) {
  const { theme } = useTheme();
  const { language, isArabic: ar } = useLocale();
  const { content } = usePlatform();
  const settings = useSettings();
  const [conversation, setConversation] = useState<Conversation | null>(
    initialConversation,
  );
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("");
  const [historyFor, setHistoryFor] = useState(initialConversation?.id ?? "");
  const viewport = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const pending = useRef<{ body: string; clientId: string } | null>(null);
  const Back = ar ? ArrowRight : ArrowLeft;
  useSEO({
    title: ar ? "محادثة الدعم" : "Support conversation",
    description: ar
      ? "تواصل مع فريق مشروعك.net في مساحة محادثة خاصة"
      : "Contact the Mashrouak.net team in a private conversation",
    path: "/contact/chat",
    noIndex: true,
  });
  const failure = useCallback(
    (e: unknown) => {
      const code = e instanceof ApiError ? e.code : "";
      return code === "rate_limited"
        ? ar
          ? "وصلت إلى حد الطلبات؛ أعد المحاولة بعد دقيقة"
          : "Request limit reached; try again in a minute"
        : code === "conversation_resolved"
          ? ar
            ? "أُغلقت هذه المحادثة؛ ابدأ محادثة جديدة"
            : "This conversation is resolved; start a new one"
          : code === "assistant_unavailable"
            ? ar
              ? "مساعد الذكاء الاصطناعي غير مفعّل"
              : "The AI assistant is not configured"
            : code === "chat_unavailable"
              ? ar
                ? "المحادثة غير متاحة حالياً؛ استخدم البريد أو واتساب"
                : "Chat is currently unavailable; use email or WhatsApp"
              : ar
                ? "تعذّر الاتصال. رسالتك لم تُؤكّد؛ أعد المحاولة"
                : "Connection failed. Your message is not confirmed; please retry";
    },
    [ar],
  );
  useEffect(() => {
    const update = () => {
      if (viewport.current)
        viewport.current.style.height = `${window.visualViewport?.height ?? window.innerHeight}px`;
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const conversationId = conversation?.id;
  const refresh = useCallback(async () => {
    if (!conversationId) return;
    const data = await api<{ conversation: Conversation; messages: Message[] }>(
      `/chat/conversations/${conversationId}`,
    );
    setHistoryFor(conversationId);
    setMessages(data.messages);
    setConversation(data.conversation);
    setOffline(false);
    if (document.visibilityState === "visible")
      void api(`/chat/conversations/${conversationId}/read`, {
        method: "POST",
      }).catch(() => {});
  }, [conversationId]);
  useEffect(() => {
    if (!conversation?.id) return;
    let cancelled = false;
    let timer: number;
    let delay = 3500;
    const poll = async () => {
      if (cancelled) return;
      if (!document.hidden) {
        try {
          await refresh();
          delay = 3500;
        } catch {
          setOffline(true);
          delay = Math.min(delay * 2, 30000);
        }
      }
      if (!cancelled) timer = window.setTimeout(poll, delay);
    };
    void poll();
    const wake = () => {
      clearTimeout(timer);
      void poll();
    };
    window.addEventListener("online", wake);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("online", wake);
    };
  }, [conversation?.id, refresh]);
  useEffect(() => {
    if (nearBottom.current)
      end.current?.scrollIntoView({
        block: "end",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [messages.length]);
  const start = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ conversation: Conversation }>(
        "/chat/conversations",
        {
          method: "POST",
          body: JSON.stringify({ name, email, language, consent }),
        },
      );
      setConversation(data.conversation);
      setMessages([]);
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || !conversation || busy) return;
    setBusy(true);
    setError("");
    if (pending.current?.body !== input.trim())
      pending.current = { body: input.trim(), clientId: crypto.randomUUID() };
    try {
      const data = await api<{ messages: Message[] }>(
        `/chat/conversations/${conversation.id}/messages`,
        { method: "POST", body: JSON.stringify(pending.current) },
      );
      setMessages(data.messages);
      setInput("");
      pending.current = null;
      nearBottom.current = true;
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  };
  const action = async (type: "handoff" | "assistant") => {
    if (!conversation) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/chat/conversations/${conversation.id}/${type}`, {
        method: "POST",
      });
      await refresh();
      if (type === "handoff")
        setNotice(
          ar
            ? "تمت إضافة طلبك إلى صندوق الفريق؛ لا يوجد تأكيد لتوافر موظف الآن"
            : "Your request is in the team inbox; staff availability is not confirmed",
        );
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  };
  const aiAvailable = content?.aiConfigured && settings?.aiEnabled;
  const status =
    conversation?.status === "active"
      ? ar
        ? "قيد المتابعة"
        : "Active conversation"
      : conversation?.status === "resolved"
        ? ar
          ? "محادثة مغلقة"
          : "Resolved conversation"
        : ar
          ? "بانتظار مراجعة الفريق"
          : "Awaiting team review";
  return (
    <div className="chat-shell" ref={viewport}>
      <header className="chat-topbar">
        <Link to="/contact" className="chat-back">
          <Back size={18} />
          <span>{ar ? "التواصل" : "Contact"}</span>
        </Link>
        <Link to="/" aria-label={ar ? "الرئيسية" : "Home"}>
          <Logo width={164} />
        </Link>
        <div>
          <LanguageToggle compact />
          <ThemeToggle compact />
        </div>
      </header>
      <div className="chat-workspace">
        <aside className="chat-context">
          <span className="eyebrow">
            {ar ? "مساحة للتواصل" : "A SPACE TO CONNECT"}
          </span>
          <h1>
            {ar ? "لنبدأ" : "A conversation"}
            <br />
            <span>{ar ? "بمحادثة واضحة" : "is a good start"}</span>
          </h1>
          <p>
            {ar
              ? "أخبرنا عن فكرتك، أو أرسل سؤالك. يحتفظ هذا المتصفح بمحادثتك ليمكنك العودة إليها."
              : "Tell us about your idea or ask a question. This browser keeps access to your conversation so you can return to it."}
          </p>
          <div className="chat-context__note">
            <ShieldCheck size={21} />
            <p>
              {ar
                ? "محادثتك خاصة. لا ترسل كلمات مرور أو بيانات دفع أو مستندات حساسة."
                : "Your conversation is private. Please avoid passwords, payment details or sensitive documents."}
            </p>
          </div>
          <Link to="/privacy">
            {ar ? "كيف نتعامل مع بياناتك" : "How we handle your data"}
          </Link>
          <small>
            {ar
              ? "محادثة نصية · التحديث تلقائي"
              : "Text conversation · Updates automatically"}
          </small>
        </aside>
        <section
          className="chat-conversation"
          aria-label={ar ? "محادثة الدعم" : "Support conversation"}
        >
          <header className="chat-conversation__header">
            <img
              src={
                theme === "dark"
                  ? "/brand/symbol-white.svg"
                  : "/brand/symbol-colour.svg"
              }
              width="36"
              height="36"
              alt=""
            />
            <div>
              <strong>
                {ar ? "فريق مشروعك.net" : "Mashrouak.net support"}
              </strong>
              <small>
                {conversation
                  ? status
                  : ar
                    ? "تواصل مباشر مع صندوق الدعم"
                    : "A direct line to the support inbox"}
              </small>
            </div>
            <MessageSquare size={20} />
          </header>
          {!conversation ? (
            <div className="chat-start">
              <span className="chat-start__icon">
                <MessageSquare size={29} strokeWidth={1.4} />
              </span>
              <h2>
                {ar ? "مرحباً بك في مشروعك.net" : "Welcome to Mashrouak.net"}
              </h2>
              <p>
                {ar
                  ? "ابدأ محادثة محفوظة مع الفريق. الرد عند مراجعة رسالتك؛ لا ندّعي توافر موظف الآن."
                  : "Start a saved conversation with the team. Replies arrive when staff review your message; no operator availability is implied."}
              </p>
              <form onSubmit={start}>
                <label>
                  {ar ? "اسمك" : "Your name"}
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  {ar ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
                  <input
                    type="email"
                    maxLength={254}
                    dir="ltr"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="consent-label">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    {ar
                      ? "أوافق على حفظ المحادثة للرد على استفساري وفق"
                      : "I agree to conversation storage to answer my enquiry under the"}{" "}
                    <Link to="/privacy">
                      {ar ? "سياسة الخصوصية" : "privacy policy"}
                    </Link>
                  </span>
                </label>
                <button
                  className="button button--primary"
                  disabled={busy || settings?.chatEnabled === false}
                >
                  {busy ? (
                    <BusyInline
                      label={
                        ar ? "جارٍ إنشاء المحادثة" : "Creating conversation"
                      }
                    />
                  ) : (
                    <>
                      {ar ? "ابدأ المحادثة" : "Start conversation"}{" "}
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div
                className="chat-scroll"
                ref={scroller}
                onScroll={() => {
                  const el = scroller.current;
                  if (el)
                    nearBottom.current =
                      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                }}
              >
                {historyFor !== conversation.id ? (
                  offline ? (
                    <ResourceError
                      language={language}
                      onRetry={() =>
                        void refresh().catch(() => setOffline(true))
                      }
                    />
                  ) : (
                    <SkeletonRegion
                      label={ar ? "جارٍ تحميل الرسائل" : "Loading messages"}
                    >
                      <SkeletonChatHistory />
                    </SkeletonRegion>
                  )
                ) : messages.length === 0 ? (
                  <div className="chat-empty">
                    <MessageSquare size={32} />
                    <h2>
                      {ar ? "ما الذي تعمل عليه؟" : "What are you working on?"}
                    </h2>
                    <p>
                      {ar
                        ? "أرسل رسالتك الأولى لبدء المحادثة"
                        : "Send your first message to start the conversation"}
                    </p>
                  </div>
                ) : (
                  <MessageHistory messages={messages} language={language} />
                )}
                <div ref={end} />
              </div>
              {offline && (
                <div className="chat-connection" role="status">
                  {ar
                    ? "انقطع الاتصال؛ تجري إعادة المحاولة"
                    : "Connection interrupted; retrying"}
                  <button
                    type="button"
                    onClick={() => void refresh().catch(() => setOffline(true))}
                  >
                    <RotateCw size={14} />
                    {ar ? "إعادة المحاولة" : "Retry"}
                  </button>
                </div>
              )}
              <div className="chat-tools">
                <span>
                  <ShieldCheck size={12} />
                  {ar ? "محفوظة في صندوق الدعم" : "Saved in the support inbox"}
                </span>
                {conversation.status !== "resolved" && (
                  <div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void action("handoff")}
                    >
                      <UserRound size={14} />
                      {ar ? "طلب متابعة بشرية" : "Request human support"}
                    </button>
                    {aiAvailable && (
                      <button
                        type="button"
                        disabled={
                          busy ||
                          conversation.ai_state === "running" ||
                          !messages.length ||
                          !!conversation.assigned_to
                        }
                        onClick={() => void action("assistant")}
                      >
                        <Sparkles size={14} />
                        {ar
                          ? "اسأل مساعد الذكاء الاصطناعي"
                          : "Ask AI assistant"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {!aiAvailable && (
                <p className="chat-ai-note">
                  {ar
                    ? "مساعد الذكاء الاصطناعي غير مفعّل؛ الرسائل مخصصة لفريق الدعم"
                    : "AI assistant is not configured; messages go to the support team"}
                </p>
              )}
              {conversation.ai_state === "running" && (
                <p className="chat-ai-note" role="status">
                  <BusyInline
                    label={
                      ar
                        ? "يجري إنشاء إجابة بالذكاء الاصطناعي"
                        : "Generating an AI answer"
                    }
                  />
                </p>
              )}
              {conversation.ai_state === "failed" && (
                <p className="chat-ai-note" role="alert">
                  {ar
                    ? "تعذّر الحصول على إجابة آلية؛ يمكنك طلب متابعة بشرية"
                    : "AI response failed; you can request human support"}
                </p>
              )}
              {conversation.status === "resolved" ? (
                <div className="chat-resolved">
                  <span>
                    {ar
                      ? "أُغلقت هذه المحادثة"
                      : "This conversation has been resolved"}
                  </span>
                  <button
                    onClick={() => {
                      setConversation(null);
                      setMessages([]);
                    }}
                  >
                    {ar ? "محادثة جديدة" : "New conversation"}
                  </button>
                </div>
              ) : (
                <form className="chat-composer" onSubmit={send}>
                  <label className="sr-only" htmlFor="chat-message">
                    {ar ? "رسالتك" : "Your message"}
                  </label>
                  <textarea
                    id="chat-message"
                    rows={2}
                    maxLength={4000}
                    value={input}
                    dir="auto"
                    placeholder={ar ? "اكتب رسالتك…" : "Write your message…"}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    aria-label={ar ? "إرسال الرسالة" : "Send message"}
                  >
                    {busy ? (
                      <BusyInline label={ar ? "إرسال" : "Sending"} />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </form>
              )}
            </>
          )}
          {notice && (
            <p className="chat-feedback" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="chat-feedback" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
