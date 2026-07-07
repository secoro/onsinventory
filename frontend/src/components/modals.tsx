import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Trash2 } from "lucide-react";
import { changePassword, deleteAccount, inviteToHousehold } from "../api/client";
import { inputClass } from "../lib/ui";

export function ModalShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-slate-950/80 p-4">
      <div
        className={`w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 ${
          wide ? "max-h-[85vh] max-w-2xl overflow-y-auto" : "max-w-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function InviteHouseholdModal({ onClose }: { onClose: () => void }) {
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
        Invite to household
      </h3>
      {inviteMutation.isSuccess ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-300">Invite sent to {email}.</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
          >
            Close
          </button>
        </div>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            They'll get an email with a link to join your household and see the same inventory.
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
            placeholder="Email address"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {inviteMutation.isPending ? "Sending..." : "Send invite"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

export function DeleteAccountModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
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
        Delete account
      </h3>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        This permanently deletes your account. If you're the only member of your household,
        its inventory, recipes, and locations are permanently deleted too — this cannot be undone.
      </p>
      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="Current password"
        />
        <div>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Type <span className="font-semibold">DELETE</span> to confirm
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={deleteAccountMutation.isPending || !canSubmit}
            className="flex-1 rounded-lg bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {deleteAccountMutation.isPending ? "Deleting..." : "Delete my account"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
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
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Change password</h3>
      {changePasswordMutation.isSuccess ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-300">Password changed successfully.</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
          >
            Close
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
            placeholder="Current password"
          />
          <input
            required
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
            placeholder="New password"
          />
          <input
            required
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`${inputClass} ${mismatch ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30" : ""}`}
            placeholder="Confirm new password"
          />
          {mismatch && <p className="text-sm text-rose-600 dark:text-rose-300">Passwords do not match.</p>}
          {changePasswordMutation.isError && (
            <p className="text-sm text-rose-600 dark:text-rose-300">Current password is incorrect.</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changePasswordMutation.isPending || mismatch}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
