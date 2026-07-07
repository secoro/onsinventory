import { useEffect, useRef, useState } from "react";
import { ChevronDown, KeyRound, LogOut, Moon, Settings, Sun, Trash2, UserPlus } from "lucide-react";

export default function AccountMenu({
  dark,
  onToggleDark,
  onInvite,
  onChangePassword,
  onLogout,
  onDeleteAccount
}: {
  dark: boolean;
  onToggleDark: () => void;
  onInvite: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const select = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  const itemClass =
    "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Settings className="h-3.5 w-3.5" />
        Account
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          <button type="button" onClick={select(onToggleDark)} className={itemClass}>
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
          <button type="button" onClick={select(onInvite)} className={itemClass}>
            <UserPlus className="h-3.5 w-3.5" />
            Invite to household
          </button>
          <button type="button" onClick={select(onChangePassword)} className={itemClass}>
            <KeyRound className="h-3.5 w-3.5" />
            Change password
          </button>
          <button type="button" onClick={select(onLogout)} className={itemClass}>
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
          <div className="border-t border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            onClick={select(onDeleteAccount)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete account
          </button>
        </div>
      )}
    </div>
  );
}
