# CONTEXT.md — Pétala Admin Panel

> Contexto comprimido do projeto para continuidade entre sessões. Atualize após cada sprint.
> Última atualização: Sprint 1.0 — Scaffolding Inicial (2026-05-05)
---

## 📌 Visão Geral

**Pétala Admin Panel** é um dashboard standalone focado em **Governança, BI e Gestão de Marketplace**. Desacoplado do app principal (`petalapp`), mas integrado ao mesmo banco Supabase (`yfwgshnrhdjoqyydtfhl`).

- **Repo:** `c:\Users\Queta\petalapanel`
- **Stack:** React 18 + Vite + Tailwind CSS v3 + TypeScript
- **Banco:** Supabase (projeto `yfwgshnrhdjoqyydtfhl`)
- **Deploy:** Vercel (SPA mode)
- **Princípios:** Np1.md (Desacoplamento, Performance, Segurança, Escalabilidade)

---

## 🏛️ Arquitetura

### Supabase Dual Client
- **`client.ts`** — ANON KEY para autenticação via RLS (login/logout, queries de usuário)
- **`admin.ts`** — SERVICE_ROLE_KEY para operações de Super User (bypass RLS: `app_config`, `app_logs`)
- Chave protegida via Vercel Environment Variables — nunca commitada

### Shared Types
- `src/shared/types.ts` — Interfaces sincronizadas do petalapp: `Profile`, `AppConfigRow`, `Order`, `StoreInventory`, `AdCampaign`, `VideoModerationLog`, `AuditLog`, `TopVideo`

---

## 🔒 RBAC (Role-Based Access Control)

### Hierarquia de Papéis (DB Real: public.roles)
| Role             | Nível | Acesso                                     |
|------------------|-------|---------------------------------------------|
| Super User       | 4     | Design System, BI, Merchant, Moderação, tudo |
| Regional Manager | 3     | BI, Merchant, Moderação                      |
| Support          | 2     | BI, Merchant, Moderação                      |
| Seller           | 1     | Merchant Hub (área do parceiro)              |

### Implementação
- **`useAuth.tsx`** — Hook que realiza JOIN entre `public.profiles` (via `user_id`) e `public.roles` para capturar as permissões reais em tempo real. Inclui `hasRole(minRole)` numérico.
- **`ProtectedRoute.tsx`** — HOC que verifica autenticação + role mínima exigida.
- **Login Social (Google)** — Suporte a login via Google. Contas sem roles válidas na tabela `profiles` são bloqueadas imediatamente e desconectadas.
- **RLS Policy** — As tabelas protegidas (`app_config`, `app_logs`) devem exigir `role = 'Super User'` para manipulação via dashboard.

---

## 📊 Módulos

### 1. Dashboard BI (`/` e `/bi`)
- **Métricas KPI:** Receita 30d, Pedidos 30d, Ticket Médio, Video Views
- **SalesChart:** Gráfico de área (Recharts) com receita agregada por dia
- **VideoEngagementChart:** Gráfico de barras horizontal com top 10 vídeos por score
- **TanStack Query:** `staleTime: 10min`, `gcTime: 30min` (dados de BI não são real-time)

### 2. Design System Control (`/design-system`)
- **Acesso:** SuperAdmin apenas
- **Função:** Gerencia tabela `app_config` (cores CSS, flags globais como Flash Sale)
- **ConfigRow:** Detecção automática de tipo (color → color picker, boolean → toggle, string → text input)
- **Auditoria:** Cada alteração grava log em `app_logs` via `useAuditLog`

### 3. Merchant Hub (`/merchant`)
- **CampaignTable:** Lista de `ad_campaigns` com status badges, métricas (impressões, cliques, CTR)
- **ModerationPanel:** Pétala Safety Shield — lista vídeos pendentes/rejeitados com motivos da IA

---

## 🎨 Design System

### Paleta de Cores
- **Primary:** `#1eb740` (Pétala Green) → escala `petala-50` a `petala-950`
- **Surface:** `#0f1117` → escala `surface-50` a `surface-950` (dark theme)
- **Accents:** `blue (#3b82f6)`, `purple (#8b5cf6)`, `amber (#f59e0b)`, `rose (#f43f5e)`, `cyan (#06b6d4)`

### Componentes Visuais
- **Glassmorphism:** `.glass` class (bg rgba + backdrop-blur + border sutil)
- **Skeletons:** Zero CLS — `MetricCardSkeleton`, `ChartSkeleton`, `TableSkeleton`
- **Animations:** `fade-in`, `slide-up`, `skeleton` pulse
- **Typography:** Inter (sans), JetBrains Mono (mono)

### Sidebar
- Collapsible (desktop), Drawer (mobile)
- Filtragem automática de itens por role do usuário
- Avatar + role badge no footer

---

## ⚡ Performance (Np1.md)

- **TanStack Query v5:** staleTime agressivo (10min BI, 5min config)
- **Skeleton Loaders:** Todos os gráficos e tabelas possuem skeletons com altura fixa
- **Code Splitting:** Lazy imports para todas as páginas (React.lazy + Suspense)
- **Vite Chunking:** Chunks manuais: vendor-react, vendor-query, vendor-charts, vendor-supabase

---

## 🚀 Deploy

### Vercel
- **`vercel.json`:** Rewrite catch-all para `index.html` (SPA mode)
- **Cache:** Assets imutáveis (`max-age=31536000`)
- **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`

### Dev Server
- **Porta:** 5174 (distinta do petalapp em 5173)
- **Comando:** `npm run dev`

---

## 📁 Estrutura de Arquivos

```
petalapanel/
├── src/
│   ├── components/
│   │   ├── DashboardLayout.tsx      — Layout principal (Sidebar + Outlet)
│   │   ├── Sidebar.tsx              — Navegação colapsável com RBAC
│   │   └── Skeleton.tsx             — Skeletons para Zero CLS
│   ├── hooks/
│   │   └── useAuditLog.ts           — Gravação de logs de auditoria
│   ├── integrations/supabase/
│   │   ├── client.ts                — Auth client (anon key)
│   │   └── admin.ts                 — Admin client (service role)
│   ├── lib/
│   │   └── utils.ts                 — cn(), formatCurrency(), formatCompact()
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── hooks/useAuth.tsx    — AuthProvider + hook RBAC
│   │   │   ├── components/ProtectedRoute.tsx
│   │   │   └── pages/LoginPage.tsx
│   │   ├── bi/
│   │   │   ├── components/MetricCard.tsx
│   │   │   ├── components/SalesChart.tsx
│   │   │   ├── components/VideoEngagementChart.tsx
│   │   │   └── pages/BiDashboard.tsx
│   │   ├── design-system/
│   │   │   ├── components/ConfigRow.tsx
│   │   │   └── pages/DesignSystemPage.tsx
│   │   └── merchant/
│   │       ├── components/CampaignTable.tsx
│   │       ├── components/ModerationPanel.tsx
│   │       └── pages/MerchantHubPage.tsx
│   ├── shared/
│   │   └── types.ts                 — Tipos sincronizados do petalapp
│   ├── App.tsx                      — Router + providers
│   ├── main.tsx                     — Entry point
│   └── index.css                    — Tailwind + design tokens
├── index.html
├── tailwind.config.ts
├── vite.config.ts
├── vercel.json
├── .env.example
├── CONTEXT.md                       — Este arquivo
├── CLAUDE.md                        — Contexto do app principal (referência)
└── Np1.md                           — Princípios de engenharia
```

---

## 📋 Histórico de Sprints

### 🌱 Sprint 1.0 — Scaffolding Inicial (2026-05-05)

**Objetivo:** Iniciar a estrutura do Pétala Admin Panel, um dashboard standalone focado em Governança, BI e Gestão de Marketplace. Integrado ao banco do Pétala com RBAC rigoroso e controle global de configurações.

- [x] **Scaffolding:** Projeto React 18 + Vite + Tailwind CSS v3 com TypeScript, path aliases (@/), e chunking otimizado.
- [x] **Supabase Dual Client:** `client.ts` (anon key, RLS) + `admin.ts` (service role key, bypass RLS).
- [x] **Shared Types:** `types.ts` com interfaces sincronizadas do petalapp.
- [x] **RBAC Completo:** AuthProvider com hierarquia `Super User` > `Regional Manager` > `Support` > `Seller`. Busca feita via JOIN nativo no Supabase entre `profiles` e `roles`.
- [x] **Login Premium:** Tela dark com glassmorphism, gradiente emerald, eye-toggle para senha, e **Autenticação via Google**.
- [x] **Sidebar Colapsável:** Navegação filtrada por role, mobile drawer, avatar + role badge.
- [x] **Dashboard BI:** 4 KPI cards (Receita, Pedidos, Ticket Médio, Video Views) + SalesChart + VideoEngagementChart.
- [x] **Design System Control:** Tabela `app_config` editável com detecção de tipo, color picker, toggle, audit logging.
- [x] **Merchant Hub:** CampaignTable (ad_campaigns) + ModerationPanel (Safety Shield).
- [x] **Skeletons Zero CLS:** MetricCardSkeleton, ChartSkeleton, TableSkeleton.
- [x] **Vercel Config:** SPA rewrites + asset caching.
- [x] **Audit Logging:** `useAuditLog` grava em `app_logs` com user_id.
- [x] **CONTEXT.md:** Arquivo de contexto criado no formato CLAUDE.md.

**Arquivos criados:**
- `src/integrations/supabase/client.ts` — Auth client
- `src/integrations/supabase/admin.ts` — Admin client (service role)
- `src/shared/types.ts` — Shared types
- `src/lib/utils.ts` — Utilitários
- `src/hooks/useAuditLog.ts` — Audit logging hook
- `src/components/Sidebar.tsx` — Sidebar navigation
- `src/components/DashboardLayout.tsx` — Main layout
- `src/components/Skeleton.tsx` — Skeleton loaders
- `src/modules/auth/hooks/useAuth.tsx` — Auth provider + RBAC hook
- `src/modules/auth/components/ProtectedRoute.tsx` — Route guard
- `src/modules/auth/pages/LoginPage.tsx` — Login page
- `src/modules/bi/components/MetricCard.tsx` — KPI card
- `src/modules/bi/components/SalesChart.tsx` — Sales area chart
- `src/modules/bi/components/VideoEngagementChart.tsx` — Video engagement chart
- `src/modules/bi/pages/BiDashboard.tsx` — BI dashboard
- `src/modules/design-system/components/ConfigRow.tsx` — Config row editor
- `src/modules/design-system/pages/DesignSystemPage.tsx` — Design System page
- `src/modules/merchant/components/CampaignTable.tsx` — Campaign table
- `src/modules/merchant/components/ModerationPanel.tsx` — Safety Shield moderation
- `src/modules/merchant/pages/MerchantHubPage.tsx` — Merchant Hub page
- `src/App.tsx` — Router + providers
- `src/main.tsx` — Entry point
- `src/index.css` — Design tokens + Tailwind
- `index.html` — HTML entry
- `tailwind.config.ts` — Tailwind config
- `vite.config.ts` — Vite config
- `postcss.config.js` — PostCSS config
- `vercel.json` — Vercel SPA config
- `.env.example` — Environment template
- `.gitignore` — Git ignore rules
- `CONTEXT.md` — Este arquivo

---

### 🔑 Insight: Autenticação e Estrutura de Banco (Sessão 2026-05-05)

Durante os testes de produção, descobrimos que a estrutura do Petala App diferia do Scaffold inicial do Painel Administrativo. Registrando os detalhes críticos:
1. **O ID de Auth:** Na tabela `profiles`, a chave estrangeira de autenticação chama-se `user_id` e não `id`.
2. **Tabela de Roles Externa:** A tabela `profiles` não armazena a role diretamente como string, mas sim um UUID `role_id` que faz referência à tabela separada `public.roles`.
3. **Nomenclatura Específica:** As roles estão nomeadas em inglês (`Super User`, `Regional Manager`, `Support`, `Seller`). 
4. **Resolução:** O hook `useAuth.tsx` foi reconstruído para realizar o fetch da seguinte forma:
   `.select('id, user_id, full_name, avatar_url, roles!profiles_role_id_fkey(name)')`.
   Desta forma, mesmo logando via OAuth (Google), o Painel cruza corretamente o ID do Auth com o Perfil e recupera a role como texto em tempo real, mantendo total Case-Insensitivity.

### 🌟 Sprint 2.0 — Central de Comando Operacional (2026-05-05)

**Objetivo:** Evoluir o painel visual para uma central operacional com controle de design system (temas sazonais e feature flags), hub de lojistas com isolamento multi-tenant, e dashboard de BI com filtros granulares e exportação de dados (LGPD).

- [x] **Design System Control:** Tela de gerenciamento dinâmico consumindo `app_themes` (cores, botões) e `app_config` (feature flags: flash sales, maintenance mode). App principal escuta as atualizações via Realtime Supabase (0 deploy overhead).
- [x] **Merchant Hub Multi-tenant:** Implementação de `useStoreContext` e visão filtrada rigorosamente isolando tabelas de BI (`orders`, `ad_campaigns`, `store_inventory`) por `stores.owner_id = auth.uid()`. Admins preservam a visualização não filtrada global.
- [x] **Advanced BI:** Barra de filtros Omni (Period, Categoria, Região). O gráfico de vendas (`SalesChart.tsx`) agora inclui uma série tracejada para **comparação de período anterior** calculada no cliente com performance `O(n)`.
- [x] **Exportação CSV/JSON LGPD:** Hook modular de exportação de dados higienizados para o navegador (sem vazar PII), convertendo o payload REST da Supabase em relatórios corporativos.
- [x] **Np1 Compliance (CLS Zero):** Refinamento no `Skeleton.tsx` para assegurar que as tabelas de Moderação e os Cards Temáticos pré-renderizem áreas estritas no DOM antes do network return.

### 🛍️ Sprint 3.0 — Merchant Hub Pro (2026-05-05)

**Objetivo:** Desbloquear as capacidades completas de CRUD de inventário e criação de anúncios patrocinados para o Lojista (papéis `Seller` e `Merchant`), utilizando o isolamento via Tenancy.

- [x] **Repository Pattern (`merchantRepository.ts`):** Todas as queries referentes ao Lojista (Inventário, KPIs, Campanhas) foram centralizadas num *Repository* puro que exige o `storeId`, mitigando o risco de cross-tenant data leakage.
- [x] **Gestão de Inventário (`MerchantInventory`):** O lojista agora possui uma tabela dedicada aos seus produtos (`store_inventory`), onde pode utilizar uma busca local O(n) rápida e um form modal limpo para registrar Espécie, Peso, Preço, e mídias. O status de Moderação IA reflete em tempo real no dashboard.
- [x] **Ads & Campaign Manager (`AdsManager`):** Introdução do portal de criação de anúncios. O Lojista cria campanhas com budget e CPC personalizados, e na mesma tela, anexa seus produtos orgânicos que imediatamente recebem `is_promoted = true` no app nativo. A tela inclui um gráfico BarChart (Private BI) isolado.
- [x] **Performance UI/UX (Np1):** A navegação dentro do Hub entre Dashboard / Inventário / Marketing agora utiliza o `startTransition` do React 18, garantindo alternância das views pesadas com INP inferior a 100ms e preservando estado de cache via TanStack Query.

*Atualizar este arquivo após cada sprint com novas decisões e alterações.*

