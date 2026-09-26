import Link from "next/link"

export default function ForbiddenPage() {
  return <main className="foundation-login"><section className="login-card"><p className="foundation-kicker">ERREUR 403</p><h1>Accès interdit.</h1><p className="login-copy">Votre rôle ne permet pas d’accéder à cette ressource.</p><Link className="foundation-primary" href="/">Retour au tableau de bord</Link></section></main>
}
