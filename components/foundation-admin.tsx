"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Building2, ChevronDown, ClipboardList, FileText, KeyRound, LayoutDashboard, LogOut, Menu, Plus, Search, ShieldCheck, Users, X } from "lucide-react"

type Role = "SUPER_ADMIN" | "AGENCY_ADMIN" | "BRANCH_ADMIN" | "BRANCH_AGENT" | "DRIVER"
type User = { id: string; firstName: string; lastName: string; email: string; role: Role; status: string; agencyId?: string | null; branchId?: string | null }
type View = "dashboard" | "agencies" | "branches" | "users" | "roles" | "audit"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4010"
const nav = [
  { id: "dashboard" as View, label: "Vue d’ensemble", icon: LayoutDashboard, permission: "dashboard:platform" },
  { id: "agencies" as View, label: "Agencies", icon: Building2, permission: "agency:read" },
  { id: "branches" as View, label: "Branches", icon: Building2, permission: "branch:read" },
  { id: "users" as View, label: "Utilisateurs", icon: Users, permission: "user:read" },
  { id: "roles" as View, label: "Rôles & permissions", icon: ShieldCheck, permission: "role:read" },
  { id: "audit" as View, label: "Journal d’audit", icon: ClipboardList, permission: "audit:read" },
]

function useApi() {
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => setToken(window.sessionStorage.getItem("startafrik_access_token")), [])
  const request = async (path: string, options?: RequestInit, alreadyRefreshed = false) => {
    const response = await fetch(`${API_URL}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers || {}) } })
    if (response.status === 401 && !alreadyRefreshed && path !== "/api/auth/refresh") {
      const refreshed = await fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" })
      if (refreshed.ok) { const body = await refreshed.json(); window.sessionStorage.setItem("startafrik_access_token", body.accessToken); setToken(body.accessToken); return request(path, options, true) }
      window.sessionStorage.removeItem("startafrik_access_token"); setToken(null); throw new Error("UNAUTHORIZED")
    }
    if (response.status === 401) { window.sessionStorage.removeItem("startafrik_access_token"); setToken(null); throw new Error("UNAUTHORIZED") }
    if (!response.ok) throw new Error(response.status === 403 ? "FORBIDDEN" : "BACKEND_UNAVAILABLE")
    return response.json()
  }
  return { token, setToken, request }
}

function Status({ children }: { children: React.ReactNode }) { return <span className="foundation-status">{children}</span> }
function EmptyState({ title, copy }: { title: string; copy: string }) { return <div className="foundation-empty"><FileText aria-hidden="true" /><strong>{title}</strong><span>{copy}</span></div> }

export default function FoundationAdmin() {
  const api = useApi()
  const [view, setView] = useState<View>("dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [login, setLogin] = useState({ email: "", password: "" })
  const [loginError, setLoginError] = useState("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [dataState, setDataState] = useState<"idle" | "loading" | "error">("idle")
  const [records, setRecords] = useState<unknown[]>([])

  const role = user?.role || "SUPER_ADMIN"
  const visibleNav = useMemo(() => nav.filter((item) => role === "SUPER_ADMIN" || (role === "AGENCY_ADMIN" ? ["dashboard", "branches", "users", "audit"].includes(item.id) : ["dashboard", "users", "audit"].includes(item.id))), [role])

  useEffect(() => {
    if (!api.token) return
    setDataState("loading")
    const endpoint = view === "agencies" ? "/api/agencies" : view === "branches" ? "/api/branches" : view === "users" ? "/api/users" : view === "audit" ? "/api/audit" : null
    if (!endpoint) { setDataState("idle"); return }
    api.request(endpoint).then((result) => { setRecords(Array.isArray(result) ? result : result.data || []); setDataState("idle") }).catch(() => setDataState("error"))
  }, [api.token, view])

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setLoginError("")
    try { const result = await fetch(`${API_URL}/api/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(login) }); if (!result.ok) throw new Error("Identifiants invalides ou API indisponible."); const body = await result.json(); const accessToken = body.accessToken || body.access_token; if (!accessToken) throw new Error("Réponse d’authentification invalide."); window.sessionStorage.setItem("startafrik_access_token", accessToken); api.setToken(accessToken); setUser(body.user || body.identity || null) } catch (error) { setLoginError(error instanceof Error ? error.message : "Connexion impossible.") } finally { setLoading(false) }
  }

  async function logout() { try { await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include", headers: api.token ? { Authorization: `Bearer ${api.token}` } : {} }) } finally { window.sessionStorage.removeItem("startafrik_access_token"); api.setToken(null); setUser(null) } }
  function selectView(next: View) { setView(next); setMobileOpen(false) }

  if (!api.token) return <main className="foundation-login"><div className="login-orb orb-one" /><div className="login-orb orb-two" /><section className="login-card"><div className="foundation-brand"><span>S</span><strong>Start<span>Afrik</span></strong></div><p className="foundation-kicker">ESPACE ADMINISTRATION</p><h1>Bienvenue sur votre espace.</h1><p className="login-copy">Pilotez vos agencies, vos équipes et vos permissions depuis un espace sécurisé.</p><form onSubmit={handleLogin} className="login-form"><label>Email<input type="email" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} placeholder="vous@agence.com" /></label><label>Mot de passe<input type="password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} placeholder="••••••••" /></label>{loginError && <div className="foundation-error" role="alert">{loginError}</div>}<button className="foundation-primary" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button></form><p className="login-foot"><ShieldCheck aria-hidden="true" /> Accès protégé par StartAfrik RBAC</p></section></main>

  return <main className="foundation-shell"><aside className={`foundation-sidebar ${mobileOpen ? "is-open" : ""}`}><div className="foundation-brand"><span>S</span><strong>Start<span>Afrik</span></strong><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu"><X /></button></div><div className="tenant-card"><div className="tenant-icon"><Building2 /></div><div><strong>{user?.agencyId ? "Mon agency" : "Administration"}</strong><small>{user?.role || "Super administrateur"}</small></div><ChevronDown /></div><nav aria-label="Navigation administration"><small className="nav-label">FONDATION</small>{visibleNav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)}><item.icon />{item.label}</button>)}</nav><div className="sidebar-bottom"><div className="session-card"><div className="session-avatar">{user ? `${user.firstName?.[0] || "S"}${user.lastName?.[0] || "A"}` : "SA"}</div><div><strong>{user ? `${user.firstName} ${user.lastName}` : "Session StartAfrik"}</strong><small>{user?.role || "Session authentifiée"}</small></div></div><button className="logout-button" onClick={logout}><LogOut /> Se déconnecter</button></div></aside>{mobileOpen && <button className="foundation-overlay" onClick={() => setMobileOpen(false)} aria-label="Fermer la navigation" />}<section className="foundation-main"><header className="foundation-header"><button className="mobile-trigger" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><Menu /></button><div><span className="header-context">StartAfrik / Administration</span><strong>{visibleNav.find((item) => item.id === view)?.label}</strong></div><div className="header-user"><span>{user?.firstName?.[0] || "S"}{user?.lastName?.[0] || "A"}</span><div><strong>{user ? `${user.firstName} ${user.lastName}` : "Administrateur"}</strong><small>{user?.role || "Session"}</small></div><button onClick={logout} aria-label="Se déconnecter"><LogOut /></button></div></header><div className="foundation-content">{view === "dashboard" ? <Dashboard role={role} onNavigate={selectView} /> : <ResourcePage view={view} state={dataState} records={records} onCreate={() => {}} />}</div></section></main>
}

function Dashboard({ role, onNavigate }: { role: Role; onNavigate: (view: View) => void }) { const cards = role === "SUPER_ADMIN" ? [{ label: "Agencies", icon: Building2, view: "agencies" as View }, { label: "Branches", icon: Building2, view: "branches" as View }, { label: "Utilisateurs", icon: Users, view: "users" as View }, { label: "Événements audités", icon: Activity, view: "audit" as View }] : role === "AGENCY_ADMIN" ? [{ label: "Mon agency", icon: Building2, view: "branches" as View }, { label: "Branches accessibles", icon: Building2, view: "branches" as View }, { label: "Utilisateurs", icon: Users, view: "users" as View }, { label: "Activité récente", icon: Activity, view: "audit" as View }] : [{ label: "Ma branch", icon: Building2, view: "users" as View }, { label: "Utilisateurs", icon: Users, view: "users" as View }, { label: "Activité récente", icon: Activity, view: "audit" as View }]; return <><div className="foundation-page-head"><div><p className="foundation-kicker">TABLEAU DE BORD</p><h1>Fondation administrative</h1><p>Un aperçu sécurisé de votre périmètre StartAfrik.</p></div><Status>Données synchronisées via API</Status></div><div className="foundation-grid">{cards.map((card) => <button className="foundation-stat" key={card.label} onClick={() => onNavigate(card.view)}><span><card.icon /></span><div><small>{card.label}</small><strong>—</strong><em>Disponible après connexion API</em></div></button>)}</div><section className="foundation-panel"><div className="foundation-panel-head"><div><h2>Activité récente</h2><p>Les événements seront affichés ici depuis le journal d’audit.</p></div><button className="foundation-link" onClick={() => onNavigate("audit")}>Ouvrir le journal</button></div><EmptyState title="Aucune activité chargée" copy="Connectez l’API et la base PostgreSQL pour afficher les événements réels." /></section></> }

function ResourcePage({ view, state, records, onCreate }: { view: View; state: "idle" | "loading" | "error"; records: unknown[]; onCreate: () => void }) { const titles: Record<View, [string, string]> = { agencies: ["Agencies", "Gérez les organisations clientes et leur statut."], branches: ["Branches", "Gérez les points opérationnels dans le périmètre autorisé."], users: ["Utilisateurs", "Gérez les identités, rôles et statuts sans exposer de secrets."], roles: ["Rôles & permissions", "Visualisez les associations RBAC existantes."], audit: ["Journal d’audit", "Consultez les actions sensibles et leur contexte tenant."], dashboard: ["", ""] }; const [title, copy] = titles[view]; return <><div className="foundation-page-head"><div><p className="foundation-kicker">ADMINISTRATION</p><h1>{title}</h1><p>{copy}</p></div>{view !== "roles" && view !== "audit" && <button className="foundation-primary small" onClick={onCreate}><Plus /> Créer</button>}</div><div className="resource-toolbar"><div className="foundation-search"><Search /><input placeholder="Rechercher dans les données API" aria-label="Rechercher" /></div><button className="filter-button">Filtres <ChevronDown /></button></div><section className="foundation-panel resource-panel">{state === "loading" && <div className="foundation-loading">Chargement des données sécurisées…</div>}{state === "error" && <div className="foundation-error large">Backend indisponible ou accès refusé. Aucune donnée locale n’est affichée.</div>}{state === "idle" && records.length === 0 && <EmptyState title="Aucune donnée disponible" copy="Cette vue attend une réponse réelle de l’API backend. Les données de démonstration sont désactivées." />}{state === "idle" && records.length > 0 && <div className="resource-table"><div className="resource-row resource-head"><span>Identifiant</span><span>Nom / email</span><span>Statut</span><span>Action</span></div>{records.map((record, index) => <div className="resource-row" key={index}><span>{String((record as { id?: string }).id || "—")}</span><span>{String((record as { name?: string; email?: string }).name || (record as { email?: string }).email || "—")}</span><span><Status>{String((record as { status?: string }).status || "—")}</Status></span><span><button className="row-action">Voir</button></span></div>)}</div>}</section></> }
