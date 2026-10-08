import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import PanelNavigation from "@/components/panel-navigation";
import { roleLabel } from "@/lib/roles";

export function JEDChrome({ compact = false }) {
  return (
    <header className={compact ? "orbit-chrome orbit-chrome-compact" : "orbit-chrome"}>
      <Link href="/" className="orbit-brand" aria-label="JED Simulador — início">
        <strong>JED</strong>
        <span>BUSINESS SIMULATION / ORBITA CLEAN</span>
      </Link>
      <div className="orbit-chrome-meta">
        <span className="orbit-help">F1 AJUDA&nbsp;&nbsp;•&nbsp;&nbsp;WEB ONLINE</span>
        <strong>SYS 2.0 RC1.8 / W7.0</strong>
      </div>
    </header>
  );
}

export function PublicScreenTitle({ title, subtitle }) {
  return (
    <div className="orbit-screen-title">
      <h1>{title}</h1>
      <p>{String(subtitle || "").toUpperCase()}</p>
      <div className="orbit-rule"><span /></div>
    </div>
  );
}

export default function JEDShell({ user, role, title, subtitle, children }) {
  return (
    <div className="jed-app-shell">
      <JEDChrome />
      <div className="orbit-frame">
        <PublicScreenTitle title={title} subtitle={subtitle} />
        <div className="orbit-shell-layout">
          <aside className="orbit-command-rail" aria-label="Navegação do painel">
            <div className="orbit-user-block">
              <span>{roleLabel(role).toUpperCase()}</span>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
              {user.institution ? <small>{user.institution}</small> : null}
            </div>
            <PanelNavigation role={role} />
            <div className="orbit-rail-foot">
              <span className="orbit-status-line"><i /> SERVIDOR ONLINE</span>
              <LogoutButton />
            </div>
          </aside>
          <section className="orbit-work-area">{children}</section>
        </div>
      </div>
    </div>
  );
}
