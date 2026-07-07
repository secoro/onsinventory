import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Package, Sparkles } from "lucide-react";
import { AuthResponse, clearToken, getAuthConfig, getMe, storeToken } from "./api/client";
import AccountMenu from "./components/AccountMenu";
import { ChangePasswordModal, DeleteAccountModal, FeedbackModal, InviteHouseholdModal } from "./components/modals";
import { useRecommendationsQuery } from "./hooks/queries";
import { topRecommendation } from "./lib/recommendation";
import DashboardPage from "./pages/Dashboard";
import MealPlannerPage from "./pages/MealPlanner";
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from "./pages/auth";
import { AuthUser } from "./types";

export default function App() {
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState<"home" | "planner">("home");
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("theme") !== "light");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showInviteHousehold, setShowInviteHousehold] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const [urlAuthState] = useState(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path === "/reset-password" && params.get("token")) {
      return { view: "reset-password" as const, resetToken: params.get("token")!, inviteToken: null as string | null };
    }
    if (path === "/join" && params.get("token")) {
      return { view: "register" as const, resetToken: null as string | null, inviteToken: params.get("token")! };
    }
    return { view: "login" as const, resetToken: null as string | null, inviteToken: null as string | null };
  });
  const [authView, setAuthView] = useState<"login" | "register" | "forgot-password" | "reset-password">(
    urlAuthState.view
  );

  const backToLogin = () => {
    window.history.replaceState({}, "", "/");
    setAuthView("login");
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (urlAuthState.view !== "login") {
      // Landed on a join or reset-password link - always show that flow instead
      // of silently resuming whatever session happens to already be in this
      // browser (which would otherwise skip the invite/reset entirely).
      setAuthChecked(true);
      return;
    }
    if (import.meta.env.VITE_SECURITY_ENABLED === "false") {
      setAuthUser({ username: "local", firstName: "Developer", token: "" });
      setAuthChecked(true);
      return;
    }
    getAuthConfig()
      .then((config) => {
        if (!config.securityEnabled) {
          setAuthUser({ username: "local", firstName: "Developer", token: "" });
          setAuthChecked(true);
          return;
        }
        getMe()
          .then((user) => setAuthUser({ ...user, token: localStorage.getItem("auth_token") ?? "" }))
          .catch(() => { clearToken(); setAuthUser(null); })
          .finally(() => setAuthChecked(true));
      })
      .catch(() => {
        setAuthUser({ username: "local", firstName: "Developer", token: "" });
        setAuthChecked(true);
      });
    // urlAuthState is set once from the URL and never changes
  }, [urlAuthState.view]);

  const handleAuthenticated = (data: AuthResponse) => {
    storeToken(data.token);
    setAuthUser({ ...data, token: data.token });
    window.history.replaceState({}, "", "/");
  };

  const handleLogout = () => {
    clearToken();
    setAuthUser(null);
    queryClient.clear();
  };

  const recommendationsQuery = useRecommendationsQuery(!!authUser);
  const topMatch = topRecommendation(recommendationsQuery.data ?? []);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  if (!authUser) {
    if (authView === "register") {
      return (
        <RegisterPage
          inviteToken={urlAuthState.inviteToken}
          onAuthenticated={handleAuthenticated}
          onBackToLogin={backToLogin}
        />
      );
    }
    if (authView === "forgot-password") {
      return <ForgotPasswordPage onBackToLogin={backToLogin} />;
    }
    if (authView === "reset-password") {
      return <ResetPasswordPage token={urlAuthState.resetToken} onBackToLogin={backToLogin} />;
    }
    return (
      <LoginPage
        onAuthenticated={handleAuthenticated}
        onShowRegister={() => setAuthView("register")}
        onShowForgotPassword={() => setAuthView("forgot-password")}
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 text-slate-800 dark:text-slate-100 md:px-8 lg:px-12">
      <main className="mx-auto max-w-7xl space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 shadow-glow"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-brand-600 dark:text-brand-100">ONS Inventory</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Welcome, {authUser.firstName}!</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Track pantry, fridge, and freezer stock and get recipe ideas before ingredients expire.
              </p>
              {authUser.householdName && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{authUser.householdName}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <AccountMenu
                dark={dark}
                onToggleDark={() => setDark((d) => !d)}
                onInvite={() => setShowInviteHousehold(true)}
                onChangePassword={() => setShowChangePassword(true)}
                onFeedback={() => setShowFeedback(true)}
                onLogout={handleLogout}
                onDeleteAccount={() => setShowDeleteAccount(true)}
              />
              <div className="rounded-xl bg-brand-100 dark:bg-brand-600/20 px-4 py-3 text-sm text-brand-800 dark:text-brand-50">
                {topMatch ? (
                  <>
                    <div className="font-medium">Top suggestion</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {topMatch.recipe.name} ({topMatch.matchPercentage}%)
                    </div>
                  </>
                ) : (
                  <div className="font-medium">Add inventory to unlock recommendations</div>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        <nav className="flex gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setPage("home")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition ${
              page === "home" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Package className="h-4 w-4" />
            Inventory
          </button>
          <button
            type="button"
            onClick={() => setPage("planner")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition ${
              page === "planner" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Meal Planner
          </button>
        </nav>

        {page === "home" ? <DashboardPage /> : <MealPlannerPage />}
      </main>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      {showInviteHousehold && <InviteHouseholdModal onClose={() => setShowInviteHousehold(false)} />}

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {showDeleteAccount && (
        <DeleteAccountModal
          onClose={() => setShowDeleteAccount(false)}
          onDeleted={() => {
            setShowDeleteAccount(false);
            handleLogout();
          }}
        />
      )}
    </div>
  );
}
