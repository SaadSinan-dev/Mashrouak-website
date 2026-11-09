import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Role, User } from "../../shared/schema";
import { useLocale } from "./locale-context";
import { api, errorKey } from "./api";
import { useResource } from "./useResource";
import { SkeletonRegion, SkeletonTable } from "../../shared/ui/Skeleton";
import { BusyInline, ResourceError } from "../../shared/ui/ResourceError";
export function Users() {
  const { t, language } = useLocale();
  const { data, error, loading, retry, reload } = useResource<{
    users: User[];
  }>("/admin/users");
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const open = (user: User | null) => {
    setEditing(user);
    setCreating(!user);
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setRole(user?.role ?? "editor");
    setActive(!!(user?.active ?? 1));
    setNotice("");
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await api(`/admin/users${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(
          editing
            ? { name, role, active, ...(password ? { password } : {}) }
            : { name, email, role, password },
        ),
      });
      setEditing(null);
      setCreating(false);
      setPassword("");
      await reload();
      setNotice(t("saved"));
    } catch (err) {
      setNotice(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{t("sessionPrivate")}</span>
          <h1>{t("users")}</h1>
          <p>{t("passwordHint")}</p>
        </div>
        <button className="admin-button" onClick={() => open(null)}>
          <Plus size={17} />
          {t("create")}
        </button>
      </div>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {(editing || creating) && (
        <form className="user-form" onSubmit={submit}>
          <label>
            {t("name")}
            <input
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            {t("email")}
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              readOnly={!!editing}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {t("role")}
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {(["owner", "editor", "support"] as const).map((r) => (
                <option key={r} value={r}>
                  {t(r)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(editing ? "newPassword" : "password")}
            <input
              type="password"
              autoComplete="new-password"
              required={!editing}
              minLength={14}
              maxLength={256}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {editing && (
            <label className="editor-toggle">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              {t("enabled")}
            </label>
          )}
          <div className="form-actions">
            <button className="admin-button" disabled={busy}>
              {busy ? <BusyInline label={t("saving")} /> : t("save")}
            </button>
            <button
              type="button"
              className="admin-button admin-button--text"
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setPassword("");
              }}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <SkeletonRegion label={t("loading")}>
          <SkeletonTable />
        </SkeletonRegion>
      ) : error ? (
        <ResourceError language={language} onRetry={retry} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("email")}</th>
                <th>{t("role")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td dir="ltr">{user.email}</td>
                  <td>{t(user.role)}</td>
                  <td>{t(user.active ? "enabled" : "disabled")}</td>
                  <td>
                    <button
                      className="admin-button admin-button--text"
                      onClick={() => open(user)}
                    >
                      {t("edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export function Account() {
  const { t } = useLocale();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, password }),
      });
      window.dispatchEvent(new Event("mashrouak:unauthorized"));
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>{t("changePassword")}</h1>
          <p>{t("passwordHint")}</p>
        </div>
      </div>
      <form className="account-form" onSubmit={submit}>
        <label>
          {t("currentPassword")}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          {t("newPassword")}
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={14}
            maxLength={256}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="admin-button" disabled={busy}>
          {busy ? <BusyInline label={t("saving")} /> : t("changePassword")}
        </button>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
      </form>
    </>
  );
}
export function AuditLog() {
  const { t, language, ar } = useLocale();
  const { data, loading, error, retry } = useResource<{
    logs: {
      id: string;
      actor_name: string;
      action: string;
      target_id: string;
      detail: string;
      created_at: string;
    }[];
  }>("/admin/audit");
  const actions: Record<string, [string, string]> = {
    "auth.login": ["تسجيل دخول", "Signed in"],
    "auth.password": ["تغيير كلمة المرور", "Changed password"],
    "content.create": ["إضافة محتوى", "Created content"],
    "content.save": ["حفظ مسودة", "Saved draft"],
    "content.publish": ["نشر محتوى", "Published content"],
    "content.draft": ["إلغاء نشر", "Unpublished content"],
    "content.archived": ["أرشفة محتوى", "Archived content"],
    "content.delete": ["حذف محتوى", "Deleted content"],
    "content.restore": ["استعادة نسخة", "Restored revision"],
    "media.upload": ["رفع صورة", "Uploaded image"],
    "media.edit": ["تعديل وصف صورة", "Updated image text"],
    "media.delete": ["حذف صورة", "Deleted image"],
    "support.reply": ["إرسال رد", "Sent support reply"],
    "support.status": ["تحديث حالة محادثة", "Updated conversation"],
    "user.create": ["إضافة مستخدم", "Created user"],
    "user.update": ["تحديث مستخدم", "Updated user"],
  };
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{t("sessionPrivate")}</span>
          <h1>{t("audit")}</h1>
        </div>
      </div>
      {loading ? (
        <SkeletonRegion label={t("loading")}>
          <SkeletonTable rows={8} />
        </SkeletonRegion>
      ) : error ? (
        <ResourceError language={language} onRetry={retry} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("actor")}</th>
                <th>{t("action")}</th>
                <th>{t("target")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString(language)}</td>
                  <td>{log.actor_name || "—"}</td>
                  <td>{actions[log.action]?.[ar ? 0 : 1] ?? log.action}</td>
                  <td>
                    <code>{log.target_id?.slice(0, 8) || "—"}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
