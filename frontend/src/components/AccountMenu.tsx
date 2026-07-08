import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleUser, Info, KeyRound, LogOut, Menu, MessageSquare, Moon, Sun, Trash2, UserPlus, X } from "lucide-react";

const itemClass =
  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";

function Dropdown({
  label,
  icon,
  openIcon,
  children
}: {
  label: string;
  icon: ReactNode;
  openIcon?: ReactNode;
  children: (close: () => void) => ReactNode;
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

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? `Close ${label}` : `Open ${label}`}
        aria-expanded={open}
        className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {open ? (openIcon ?? icon) : icon}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export default function AccountMenu({
  dark,
  onToggleDark,
  onInvite,
  onChangePassword,
  onFeedback,
  onAbout,
  onLogout,
  onDeleteAccount
}: {
  dark: boolean;
  onToggleDark: () => void;
  onInvite: () => void;
  onChangePassword: () => void;
  onFeedback: () => void;
  onAbout: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const select = (close: () => void, action: () => void) => () => {
    close();
    action();
  };

  return (
    <div className="flex items-center gap-2">
      <Dropdown label="profile menu" icon={<CircleUser className="h-5 w-5" />}>
        {(close) => (
          <>
            <button type="button" onClick={select(close, onChangePassword)} className={itemClass}>
              <KeyRound className="h-3.5 w-3.5" />
              Change password
            </button>
            <div className="border-t border-slate-200 dark:border-slate-700" />
            <button
              type="button"
              onClick={select(close, onDeleteAccount)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete account
            </button>
          </>
        )}
      </Dropdown>
      <Dropdown label="menu" icon={<Menu className="h-5 w-5" />} openIcon={<X className="h-5 w-5" />}>
        {(close) => (
          <>
            <button type="button" onClick={select(close, onToggleDark)} className={itemClass}>
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {dark ? "Light mode" : "Dark mode"}
            </button>
            <button type="button" onClick={select(close, onInvite)} className={itemClass}>
              <UserPlus className="h-3.5 w-3.5" />
              Invite to household
            </button>
            <button type="button" onClick={select(close, onFeedback)} className={itemClass}>
              <MessageSquare className="h-3.5 w-3.5" />
              Send feedback
            </button>
            <button type="button" onClick={select(close, onAbout)} className={itemClass}>
              <Info className="h-3.5 w-3.5" />
              About
            </button>
            <button type="button" onClick={select(close, onLogout)} className={itemClass}>
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </>
        )}
      </Dropdown>
    </div>
  );
}
