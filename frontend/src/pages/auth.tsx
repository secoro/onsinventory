import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AuthResponse,
  forgotPassword,
  getInvitePreview,
  login,
  register,
  resetPassword
} from "../api/client";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n";
import { inputClass } from "../lib/ui";

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-8 shadow-glow">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-600 dark:text-brand-100">ONS Inventory</p>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function LoginPage({
  onAuthenticated,
  onShowRegister,
  onShowForgotPassword
}: {
  onAuthenticated: (data: AuthResponse) => void;
  onShowRegister: () => void;
  onShowForgotPassword: () => void;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: onAuthenticated
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <AuthShell title={t("auth.signIn")}>
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <input
          required
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
          placeholder={t("auth.username")}
        />
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder={t("auth.password")}
        />
        {loginMutation.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-300">{t("auth.loginError")}</p>
        )}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
        >
          {loginMutation.isPending ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" onClick={onShowForgotPassword} className="text-brand-600 dark:text-brand-100 hover:underline">
          {t("auth.forgotPassword")}
        </button>
        <button type="button" onClick={onShowRegister} className="text-brand-600 dark:text-brand-100 hover:underline">
          {t("auth.createAccount")}
        </button>
      </div>
    </AuthShell>
  );
}

export function RegisterPage({
  inviteToken,
  onAuthenticated,
  onBackToLogin
}: {
  inviteToken: string | null;
  onAuthenticated: (data: AuthResponse) => void;
  onBackToLogin: () => void;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [invitePreview, setInvitePreview] = useState<{ householdName: string } | "invalid" | null>(null);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (!inviteToken) return;
    getInvitePreview(inviteToken)
      .then((preview) => setInvitePreview({ householdName: preview.householdName }))
      .catch(() => setInvitePreview("invalid"));
  }, [inviteToken]);

  const registerMutation = useMutation({
    mutationFn: () =>
      register({
        username: username.trim(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        inviteToken: inviteToken ?? undefined
      }),
    onSuccess: onAuthenticated
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    registerMutation.mutate();
  };

  return (
    <AuthShell title={t("auth.createAccount")}>
      {inviteToken && invitePreview && (
        <p className="mt-3 rounded-lg bg-brand-100 dark:bg-brand-600/20 px-3 py-2 text-sm text-brand-800 dark:text-brand-50">
          {invitePreview === "invalid"
            ? t("auth.inviteInvalid")
            : t("auth.joiningHousehold", { household: invitePreview.householdName })}
        </p>
      )}
      {!inviteToken && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {t("auth.newHousehold")}
        </p>
      )}
      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
            placeholder={t("auth.firstName")}
          />
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
            placeholder={t("auth.lastName")}
          />
        </div>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
          placeholder={t("auth.username")}
        />
        <input
          required
          type="text"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder={t("form.email")}
        />
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder={t("auth.passwordMin")}
        />
        <input
          required
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`${inputClass} ${mismatch ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30" : ""}`}
          placeholder={t("auth.confirmPassword")}
        />
        {mismatch && <p className="text-sm text-rose-600 dark:text-rose-300">{t("form.passwordMismatch")}</p>}
        {registerMutation.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-300">{registerMutation.error.message}</p>
        )}
        <button
          type="submit"
          disabled={registerMutation.isPending || mismatch}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
        >
          {registerMutation.isPending ? t("auth.creatingAccount") : t("auth.createAccountButton")}
        </button>
      </form>
      <button type="button" onClick={onBackToLogin} className="mt-4 text-sm text-brand-600 dark:text-brand-100 hover:underline">
        {t("auth.backToSignIn")}
      </button>
    </AuthShell>
  );
}

export function ForgotPasswordPage({ onBackToLogin }: { onBackToLogin: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");

  const forgotPasswordMutation = useMutation({
    mutationFn: () => forgotPassword(email.trim())
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate();
  };

  return (
    <AuthShell title={t("auth.resetTitle")}>
      {forgotPasswordMutation.isSuccess ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          {t("auth.resetSent")}
        </p>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("auth.resetDescription")}
          </p>
          <input
            required
            autoFocus
            type="text"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder={t("form.email")}
          />
          <button
            type="submit"
            disabled={forgotPasswordMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {forgotPasswordMutation.isPending ? t("common.sending") : t("auth.sendResetLink")}
          </button>
        </form>
      )}
      <button type="button" onClick={onBackToLogin} className="mt-4 text-sm text-brand-600 dark:text-brand-100 hover:underline">
        {t("auth.backToSignIn")}
      </button>
    </AuthShell>
  );
}

export function ResetPasswordPage({ token, onBackToLogin }: { token: string | null; onBackToLogin: () => void }) {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetPassword(token!, newPassword)
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mismatch || !token) return;
    resetPasswordMutation.mutate();
  };

  return (
    <AuthShell title={t("auth.chooseNewPassword")}>
      {!token ? (
        <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">{t("auth.resetMissingToken")}</p>
      ) : resetPasswordMutation.isSuccess ? (
        <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-300">
          {t("auth.resetSuccess")}
        </p>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <input
            required
            autoFocus
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            placeholder={t("auth.newPasswordMin")}
          />
          <input
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`${inputClass} ${mismatch ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30" : ""}`}
            placeholder={t("form.confirmNewPassword")}
          />
          {mismatch && <p className="text-sm text-rose-600 dark:text-rose-300">{t("form.passwordMismatch")}</p>}
          {resetPasswordMutation.isError && (
            <p className="text-sm text-rose-600 dark:text-rose-300">{resetPasswordMutation.error.message}</p>
          )}
          <button
            type="submit"
            disabled={resetPasswordMutation.isPending || mismatch}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {resetPasswordMutation.isPending ? t("common.saving") : t("auth.saveNewPassword")}
          </button>
        </form>
      )}
      <button type="button" onClick={onBackToLogin} className="mt-4 text-sm text-brand-600 dark:text-brand-100 hover:underline">
        {t("auth.backToSignIn")}
      </button>
    </AuthShell>
  );
}
