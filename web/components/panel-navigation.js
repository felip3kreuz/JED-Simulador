"use client";

import { useEffect, useMemo, useState } from "react";

const navigation = {
  admin: [
    ["#visao-geral", "VISÃO GERAL", "contas e estado"],
    ["#usuarios", "USUÁRIOS", "acesso e permissões"],
    ["#credenciais", "MENTORES", "credenciais MTR"],
  ],
  mentor: [
    ["#visao-geral", "VISÃO GERAL", "turmas e empresas"],
    ["#turmas", "TURMAS", "códigos e resultados"],
    ["#alunos", "ALUNOS", "convites individuais"],
  ],
  aluno: [
    ["#empresa", "MINHA EMPRESA", "situação atual"],
    ["#decisoes", "DECISÕES", "próxima semana"],
    ["#turmas", "TURMAS", "vínculos online"],
  ],
};

function sectionFor(href) {
  if (!href?.startsWith("#")) return null;
  return document.getElementById(href.slice(1));
}

export default function PanelNavigation({ role }) {
  const items = useMemo(() => navigation[role] || [], [role]);
  const [active, setActive] = useState(items[0]?.[0] || "");

  useEffect(() => {
    if (!items.length) return undefined;

    const initialHash = window.location.hash;
    if (initialHash && items.some(([href]) => href === initialHash) && sectionFor(initialHash)) {
      setActive(initialHash);
    } else {
      setActive(items[0][0]);
    }

    const sections = items
      .map(([href]) => ({ href, element: sectionFor(href) }))
      .filter(({ element }) => Boolean(element));

    if (!sections.length || !("IntersectionObserver" in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target?.id) return;
        const href = `#${visible.target.id}`;
        if (items.some(([candidate]) => candidate === href)) setActive(href);
      },
      { rootMargin: "-15% 0px -65% 0px", threshold: [0, 0.05, 0.2, 0.5] },
    );

    sections.forEach(({ element }) => observer.observe(element));
    return () => observer.disconnect();
  }, [items]);

  function navigate(event, href) {
    event.preventDefault();
    const target = sectionFor(href);
    if (!target) return;

    setActive(href);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);

    if (typeof target.focus === "function") {
      const previousTabIndex = target.getAttribute("tabindex");
      target.setAttribute("tabindex", "-1");
      window.setTimeout(() => {
        target.focus({ preventScroll: true });
        if (previousTabIndex === null) target.removeAttribute("tabindex");
        else target.setAttribute("tabindex", previousTabIndex);
      }, 350);
    }
  }

  return (
    <nav>
      {items.map(([href, label, detail]) => (
        <a
          key={href}
          href={href}
          className={active === href ? "active" : ""}
          aria-current={active === href ? "location" : undefined}
          onClick={(event) => navigate(event, href)}
        >
          <strong>{label}</strong>
          <span>{detail}</span>
        </a>
      ))}
    </nav>
  );
}
