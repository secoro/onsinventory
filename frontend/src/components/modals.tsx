import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Info, Mail, MessageSquare, Trash2 } from "lucide-react";
import { changePassword, deleteAccount, inviteToHousehold, sendFeedback } from "../api/client";
import { useI18n } from "../i18n";
import { inputClass } from "../lib/ui";

export function ModalShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-slate-950/80 p-4">
      <div
        className={`w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[85vh] overflow-y-auto ${
          wide ? "max-w-2xl" : "max-w-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function InviteHouseholdModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const inviteMutation = useMutation({
    mutationFn: () => inviteToHousehold(email.trim())
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate();
  };

  return (
    <ModalShell>
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <Mail className="h-4 w-4" />
        {t("menu.invite")}
      </h3>
      {inviteMutation.isSuccess ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-300">{t("invite.sent", { email })}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
          >
            {t("common.close")}
          </button>
        </div>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("invite.description")}
          </p>
          <input
            ref={inputRef}
            required
            type="text"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder={t("form.email")}
          />
          {inviteMutation.isError && (
            <p className="text-sm text-rose-600 dark:text-rose-300">{inviteMutation.error.message}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {inviteMutation.isPending ? t("common.sending") : t("invite.send")}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

export function AboutModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <ModalShell>
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <Info className="h-4 w-4" />
        {t("menu.about")}
      </h3>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
        <div>
          <p className="font-medium text-slate-900 dark:text-white">OnsInventory</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("about.subtitle")}</p>
        </div>
        <span className="rounded-lg bg-brand-100 dark:bg-brand-600/20 px-3 py-1 text-sm font-semibold text-brand-800 dark:text-brand-50">
          v{__APP_VERSION__}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
      >
        {t("common.close")}
      </button>
    </ModalShell>
  );
}

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const feedbackMutation = useMutation({
    mutationFn: () => sendFeedback(message.trim())
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    feedbackMutation.mutate();
  };

  return (
    <ModalShell>
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <MessageSquare className="h-4 w-4" />
        {t("menu.feedback")}
      </h3>
      {feedbackMutation.isSuccess ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-300">{t("feedback.thanks")}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
          >
            {t("common.close")}
          </button>
        </div>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("feedback.description")}
          </p>
          <textarea
            ref={inputRef}
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} resize-y`}
            placeholder={t("feedback.placeholder")}
          />
          {feedbackMutation.isError && (
            <p className="text-sm text-rose-600 dark:text-rose-300">{feedbackMutation.error.message}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={feedbackMutation.isPending || !message.trim()}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {feedbackMutation.isPending ? t("common.sending") : t("menu.feedback")}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

export function DeleteAccountModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const canSubmit = confirmText.trim().toUpperCase() === "DELETE" && password.length > 0;

  useEffect(() => { inputRef.current?.focus(); }, []);

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: onDeleted
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    deleteAccountMutation.mutate();
  };

  return (
    <ModalShell>
      <h3 className="flex items-center gap-2 text-lg font-semibold text-rose-600 dark:text-rose-300">
        <Trash2 className="h-4 w-4" />
        {t("menu.deleteAccount")}
      </h3>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        {t("deleteAccount.warning")}
      </p>
      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder={t("form.currentPassword")}
        />
        <div>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("deleteAccount.typeToConfirm").split("DELETE")[0]}
            <span className="font-semibold">DELETE</span>
            {t("deleteAccount.typeToConfirm").split("DELETE")[1]}
          </label>
          <input
            required
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={`${inputClass} mt-1 w-full`}
            placeholder="DELETE"
          />
        </div>
        {deleteAccountMutation.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-300">{deleteAccountMutation.error.message}</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={deleteAccountMutation.isPending || !canSubmit}
            className="flex-1 rounded-lg bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {deleteAccountMutation.isPending ? t("deleteAccount.deleting") : t("deleteAccount.confirm")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = next !== confirm && confirm.length > 0;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const changePasswordMutation = useMutation({
    mutationFn: () => changePassword(current, next)
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    changePasswordMutation.mutate();
  };

  return (
    <ModalShell>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("menu.changePassword")}</h3>
      {changePasswordMutation.isSuccess ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-300">{t("changePassword.success")}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
          >
            {t("common.close")}
          </button>
        </div>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            required
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
            placeholder={t("form.currentPassword")}
          />
          <input
            required
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
            placeholder={t("form.newPassword")}
          />
          <input
            required
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`${inputClass} ${mismatch ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30" : ""}`}
            placeholder={t("form.confirmNewPassword")}
          />
          {mismatch && <p className="text-sm text-rose-600 dark:text-rose-300">{t("form.passwordMismatch")}</p>}
          {changePasswordMutation.isError && (
            <p className="text-sm text-rose-600 dark:text-rose-300">{t("changePassword.wrongCurrent")}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={changePasswordMutation.isPending || mismatch}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
