import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Search,
  Send,
} from "lucide-react";
import type { Conversation, Message } from "../../shared/schema";
import { api, errorKey } from "./api";
import { useLocale } from "./locale-context";
import { useResource } from "./useResource";
import { MessageHistory } from "../../src/components/shared/MessageHistory";
import {
  SkeletonChatHistory,
  SkeletonRegion,
  SkeletonText,
} from "../../shared/ui/Skeleton";
import { BusyInline, ResourceError } from "../../shared/ui/ResourceError";

export function SupportInbox() {
  const { t, language, ar } = useLocale();
  const [search, setSearch] = useState("");
  const { data, error, loading, retry, reload } = useResource<{
    conversations: Conversation[];
  }>(`/admin/inbox?q=${encodeURIComponent(search)}`, 5000);
  const { data: operators } = useResource<{
    operators: { id: string; name: string }[];
  }>("/admin/operators");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    conversation: Conversation;
    messages: Message[];
  } | null>(null);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editedStatus, setEditedStatus] = useState<
    Conversation["status"] | undefined
  >();
  const [editedAssignee, setEditedAssignee] = useState<string | undefined>();
  const pendingStatus =
    editedStatus ?? detail?.conversation.status ?? "pending";
  const assignee = editedAssignee ?? detail?.conversation.assigned_to ?? "";
  const pending = useRef<{ body: string; clientId: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const selection = useRef(selected);
  const select = (id: string | null) => {
    selection.current = id;
    setSelected(id);
    setDetail(null);
    setDetailLoading(!!id);
    setDetailError(null);
    setInput("");
    setNotice("");
    setEditedStatus(undefined);
    setEditedAssignee(undefined);
  };
  const loadDetail = useCallback(async () => {
    if (!selected) return;
    try {
      const result = await api<{
        conversation: Conversation;
        messages: Message[];
      }>(`/admin/inbox/${selected}`);
      if (!mounted.current || selection.current !== selected) return;
      setDetail(result);
      setDetailError(null);
      void api(`/admin/inbox/${selected}/read`, { method: "POST" }).catch(
        () => {},
      );
    } catch (e) {
      if (mounted.current && selection.current === selected) setDetailError(e);
    } finally {
      if (mounted.current && selection.current === selected)
        setDetailLoading(false);
    }
  }, [selected]);
  useEffect(() => {
    mounted.current = true;
    void loadDetail();
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadDetail();
    }, 4000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [loadDetail, selected]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [detail?.messages.length]);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !input.trim()) return;
    setBusy(true);
    setNotice("");
    if (pending.current?.body !== input.trim())
      pending.current = { body: input.trim(), clientId: crypto.randomUUID() };
    try {
      await api(`/admin/inbox/${selected}/messages`, {
        method: "POST",
        body: JSON.stringify(pending.current),
      });
      setInput("");
      pending.current = null;
      await loadDetail();
      void reload();
    } catch (err) {
      setNotice(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };
  const update = async () => {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      await api(`/admin/inbox/${selected}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: pendingStatus,
          assignedTo: assignee || null,
        }),
      });
      await loadDetail();
      void reload();
      setNotice(t("saved"));
    } catch (err) {
      setNotice(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="inbox-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{t("support")}</span>
          <h1>{t("inbox")}</h1>
          <p>{t("inboxNote")}</p>
        </div>
      </div>
      <div
        className={`inbox-layout ${selected ? "inbox-layout--selected" : ""}`}
      >
        <aside className="inbox-list">
          <label className="admin-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
            />
          </label>
          {loading ? (
            <SkeletonRegion label={t("loading")}>
              {[0, 1, 2, 3].map((i) => (
                <div className="inbox-list-skeleton" key={i}>
                  <SkeletonText lines={3} />
                </div>
              ))}
            </SkeletonRegion>
          ) : error && !data ? (
            <ResourceError language={language} onRetry={retry} />
          ) : !data?.conversations.length ? (
            <div className="admin-empty">
              <MessageSquare size={28} />
              <p>{t("noConversations")}</p>
            </div>
          ) : (
            data.conversations.map((conversation) => (
              <button
                className={`inbox-list__item ${selected === conversation.id ? "is-active" : ""}`}
                key={conversation.id}
                onClick={() => select(conversation.id)}
              >
                <div>
                  <strong>{conversation.name}</strong>
                  <time>
                    {new Intl.DateTimeFormat(language, {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(conversation.updated_at))}
                  </time>
                </div>
                <p dir="auto">{conversation.preview || "—"}</p>
                <div>
                  <span
                    className={`status-badge status-badge--${conversation.status}`}
                  >
                    {t(conversation.status)}
                  </span>
                  {!!conversation.unread && (
                    <b className="unread-count">{conversation.unread}</b>
                  )}
                </div>
              </button>
            ))
          )}
        </aside>
        <section className="inbox-detail">
          {!selected ? (
            <div className="admin-empty inbox-select">
              <MessageSquare size={35} strokeWidth={1.3} />
              <p>{t("selectConversation")}</p>
            </div>
          ) : detailLoading ? (
            <SkeletonRegion label={t("loading")}>
              <SkeletonChatHistory />
            </SkeletonRegion>
          ) : detailError && !detail ? (
            <ResourceError
              language={language}
              onRetry={() => {
                setDetailLoading(true);
                void loadDetail();
              }}
            />
          ) : (
            detail && (
              <>
                <header className="inbox-detail__header">
                  <button
                    className="icon-button inbox-mobile-back"
                    aria-label={t("back")}
                    onClick={() => select(null)}
                  >
                    {ar ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                  </button>
                  <div>
                    <strong>{detail.conversation.name}</strong>
                    <small dir="ltr">{detail.conversation.email || "—"}</small>
                  </div>
                  <span
                    className={`status-badge status-badge--${detail.conversation.status}`}
                  >
                    {t(detail.conversation.status)}
                  </span>
                </header>
                <div className="inbox-status">
                  <label>
                    {t("status")}
                    <select
                      value={pendingStatus}
                      onChange={(e) =>
                        setEditedStatus(
                          e.target.value as Conversation["status"],
                        )
                      }
                    >
                      {(["pending", "active", "resolved"] as const).map(
                        (status) => (
                          <option key={status} value={status}>
                            {t(status)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    {t("assign")}
                    <select
                      value={assignee}
                      onChange={(e) => setEditedAssignee(e.target.value)}
                    >
                      <option value="">{t("unassigned")}</option>
                      {operators?.operators.map((operator) => (
                        <option value={operator.id} key={operator.id}>
                          {operator.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="admin-button admin-button--secondary"
                    disabled={busy}
                    onClick={() => void update()}
                  >
                    {t("save")}
                  </button>
                </div>
                <div className="inbox-messages">
                  {detail.messages.length ? (
                    <MessageHistory
                      messages={detail.messages}
                      language={language}
                      viewer="operator"
                    />
                  ) : (
                    <div className="admin-empty">
                      <p>{t("empty")}</p>
                    </div>
                  )}
                  <div ref={end} />
                </div>
                {detailError && (
                  <p className="admin-error" role="status">
                    {t("connection")}
                    <button onClick={() => void loadDetail()}>
                      {t("retry")}
                    </button>
                  </p>
                )}
                {detail.conversation.status !== "resolved" && (
                  <form className="chat-composer" onSubmit={send}>
                    <label className="sr-only" htmlFor="operator-reply">
                      {t("message")}
                    </label>
                    <textarea
                      id="operator-reply"
                      rows={2}
                      dir="auto"
                      maxLength={4000}
                      placeholder={t("message")}
                      value={input}
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
                      aria-label={t("send")}
                    >
                      {busy ? (
                        <BusyInline label={t("send")} />
                      ) : (
                        <Send size={19} />
                      )}
                    </button>
                  </form>
                )}
                {notice && (
                  <p className="admin-notice" role="status">
                    {notice}
                  </p>
                )}
              </>
            )
          )}
        </section>
      </div>
    </div>
  );
}
