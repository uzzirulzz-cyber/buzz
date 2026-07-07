# BlockExchange — DB Restore Point

This is the reference restore point for the BlockExchange database. Running the restore script below resets the database to a clean, seeded state.

## How to Restore

```bash
bash db/restore-point.sh
```

## Seeded Accounts (6)

| # | UID | Name | Email | Password | Role | Invitation Code |
|---|-----|------|-------|----------|------|-----------------|
| 1 | BX-000001 | Super Admin | crdbixx@gmail.com | 123playbeat | SUPER_ADMIN | — |
| 2 | BX-000002 | SubAgent 1 | subagent1@trade.com | default | SUB_AGENT | PB-AG001 |
| 3 | BX-000003 | SubAgent 2 | subagent2@trade2.com | default | SUB_AGENT | PB-AG002 |
| 4 | BX-000004 | SubAgent 3 | subagent3@trade3.com | default | SUB_AGENT | PB-AG003 |
| 5 | BX-000005 | SubAgent 4 | subagent4@trade4.com | default | SUB_AGENT | PB-AG004 |
| 6 | BX-000006 | SubAgent 5 | subagent5@trade5.com | default | SUB_AGENT | PB-AG005 |

**Note:** Sub-Agent accounts have `mustChangePassword=true` — they are forced to change the default password on first login.

## Database

- **Provider:** Neon PostgreSQL (serverless)
- **Host:** ep-proud-mountain-ahl1fd3b-pooler.c-3.us-east-1.aws.neon.tech
- **Database:** neondb

## What the Restore Does

1. **Resets** the database (`prisma db push --force-reset`) — drops ALL data
2. **Recreates** all tables from `prisma/schema.prisma`
3. **Regenerates** the Prisma Client
4. **Seeds** the 6 default accounts above

## After Restore

- Super Admin can log in at `/admin` with `crdbixx@gmail.com` / `123playbeat`
- Sub-Agents can log in at `/admin` with their credentials (forced password change)
- Customers can register at `/register` using a valid invitation code (PB-AG001..PB-AG005)
- No customer accounts, trades, deposits, or transactions exist (clean slate)
