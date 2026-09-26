import Link from "next/link"

export default function NotFound() {
  return <main className="foundation-login"><section className="login-card"><p className="foundation-kicker">ERREUR 404</p><h1>Ressource introuvable.</h1><p className="login-copy">Cette page n’existe pas ou n’est plus disponible.</p><Link className="foundation-primary" href="/">Retour au tableau de bord</Link></section></main>
}
