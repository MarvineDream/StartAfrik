# StartAfrik backend — Phase 1

Architecture cible:

`Route → Controller → Service → Repository/Prisma → PostgreSQL`

Modules Phase 1:

- `auth`: login, refresh, logout, me
- `users`: gestion des utilisateurs et statuts
- `agencies`: périmètre agence
- `branches`: périmètre succursale
- `audit`: traçabilité des changements

Sécurité:

- JWT access token court + refresh token révocable et stocké sous forme hashée
- RBAC avec `Role`, `Permission`, `RolePermission`
- Scope tenant dérivé du contexte authentifié, jamais des IDs fournis par le frontend
- Rate limiting sur login, Helmet, CORS explicite et validation Zod

Le modèle Prisma s'arrête volontairement avant les modules véhicules, chauffeurs, voyages, réservations, paiements et billets.
