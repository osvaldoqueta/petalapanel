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

### ✨ Sprint 3.1 — Formulário de Produto (Paridade App Nativo) (2026-05-05)

**Objetivo:** Refatorar a UI de edição/criação de produtos no Merchant Hub para total fidelidade aos recursos do Mobile App, garantindo escalabilidade de dados sem ferir o padrão Np1 de isolamento de *tenant*.

- [x] **Upload Nativo e Storage:** Substituição do campo "URL de Imagem" por uma Dropzone de upload direto. Implementação do `supabase.storage.from('plant-images').upload()`, assegurando *Public URLs* transparentes.
- [x] **Paridade de Estrutura de Dados:** Expansão da interface `StoreInventory` e do `upsertProduct` em `merchantRepository.ts` para ingerir novos campos críticos: Categoria, Subcategoria, Estoque (`stock_qty`), Preço Promocional, `ai_description` e flags de Oferta Relâmpago (`is_flash_sale`). Tudo operando dentro do boundary seguro de `storeId`.
- [x] **Engine Promocional:** Implementação visual e lógica para inserção de "Preço Original" calculando automaticamente no envio o `discount_percent` ao repositório, garantindo compatibilidade retroativa com os badges do aplicativo ("Oferta").

### ✨ Sprint 3.2 — Sistema de Categorias Dinâmico e Integração de IA (2026-05-06)

**Objetivo:** Eliminar hardcodings do sistema de inventário puxando Categorias via banco de dados, implementar a inteligência artificial Gemini para preenchimento de metadados, e padronizar as ações destrutivas (exclusão).

- [x] **Database Migration & RLS:** Criação oficial das tabelas `app_categories` e `app_subcategories` na instância central do Supabase, substituindo os arrays estáticos da aplicação e permitindo expansão dinâmica do portfólio.
- [x] **Gemini AI Integration (IA Copy):** Implementação segura (client-side via env vars) da chamada ao modelo Gemini 2.0 Flash. O sistema lê o Base64 da imagem já enviada ao Supabase Storage e gera de forma autônoma: Nome Científico, Nome Popular, Categoria ideal e Descrição de Vendas persuasiva, com injeção direta no formulário do produto (`ProductFormModal.tsx`).
- [x] **Ação de Exclusão Glassmorphism:** Criação do componente isolado `ConfirmDeleteModal.tsx` com micro-interações, estados de *loading*, e botão "Destructive". Integração do ciclo completo (State -> API -> Invalidação de Cache TanStack) na tabela principal de `MerchantInventory`.

### 🚀 Sprint 4.0 — Central de Comando Completa (2026-05-06)

**Objetivo:** Elevar o Merchant Hub para uma ferramenta de gestão completa, eliminando dependências de código estático, integrando o Gemini 2.5 Flash para automação de metadados, implementando suporte Q&A pelo painel, e refinando governança com audit logs expandidos.

- [x] **Category Repository (Np1 Desacoplamento):** Extração de `getCategories()` e `getSubcategories()` do `merchantRepository.ts` para o repositório dedicado `categoryRepository.ts` com hooks TanStack Query (`useCategories`, `useSubcategories`) e `staleTime: 1 hora`. O formulário de produto agora consome diretamente esses hooks.
- [x] **Gemini 2.5 Flash Upgrade:** Endpoint do modelo atualizado de `gemini-2.0-flash` para `gemini-2.5-flash`. Adicionado parser JSON robusto com fallback via regex (extrai campos individuais quando JSON completo falha). Retry automático com backoff de 3s em HTTP 429.
- [x] **Central de Relacionamento (MerchantSupport.tsx):** Módulo completo de Q&A management permitindo ao vendedor visualizar perguntas dos clientes agrupadas por produto, filtrar por status (Pendentes/Respondidas/Todas), responder inline com textarea, e receber notificações em tempo real via Supabase Realtime (`postgres_changes`). Badge de "Nova Pergunta" com contagem live no tab header.
- [x] **Governança Expandida (Audit Log):** Interface `AuditLog` expandida com campos opcionais `entity` e `store_id`. Hook `useAuditLog` atualizado para aceitar os novos campos mantendo retrocompatibilidade. Logging integrado em: resposta Q&A, exclusão de produtos (individual e em massa).
- [x] **UI/UX Zero CLS:** `QACardSkeleton` adicionado ao `Skeleton.tsx` com altura fixa para o novo módulo Q&A. `.env.example` atualizado com `VITE_GEMINI_API_KEY`.

**Arquivos criados:**
- `src/repositories/categoryRepository.ts` — Repositório dedicado de categorias com hooks
- `src/modules/merchant/components/MerchantSupport.tsx` — Central de Relacionamento Q&A

**Arquivos modificados:**
- `src/shared/types.ts` — `AuditLog` expandida + `ProductQuestion` interface
- `src/hooks/useAuditLog.ts` — Suporte a `entity` e `store_id`
- `src/repositories/merchantRepository.ts` — Removidas categorias, adicionados Q&A methods
- `src/modules/merchant/components/ProductFormModal.tsx` — categoryRepository + Gemini 2.5 Flash
- `src/modules/merchant/pages/MerchantHubPage.tsx` — Tab "Suporte" com badge live
- `src/modules/merchant/components/MerchantInventory.tsx` — Audit log em exclusões
- `src/components/Skeleton.tsx` — QACardSkeleton
- `.env.example` — VITE_GEMINI_API_KEY

### 🛡️ Sprint 5.0 — SuperAdmin Command Center (2026-05-06)

**Objetivo:** Modernizar a governança da plataforma com foco na equipe interna (Super User e Support), isolando lógicas de alteração de papéis, moderação global e controle financeiro.

- [x] **Gestão de Usuários (UserManagement):** Tabela administrativa que lê `public.profiles` cruzado com `public.roles`. Alteração de permissão via modal com persistência via `adminRepository.ts` (Service Role Key) para bypass de RLS seguro e imediato.
- [x] **Moderação Global:** Painel dedicado para `video_moderation_status = 'pending'`. Aprovação ou rejeição de produtos com obrigação de preenchimento do motivo, enviando notificação de push local ao vendedor correspondente via `system_notifications`.
- [x] **Configurações do Marketplace:** Controle centralizado de `store_fee_percentage` e `courier_fee_percentage`, com cálculo dinâmico da margem de lucro projetada para a plataforma.
- [x] **BI Financeiro Expandido:** Adoção rigorosa de filtros `payment_status = 'paid'`. O painel `BiDashboard` passou a espelhar GTV vs Receita Líquida (`platform_fee`), fornecendo clareza sobre o faturamento real.
- [x] **Zero CLS & Correções:** Adicionados `UserTableSkeleton` e `ModerationCardSkeleton`. Correção do bug de sumiço de Q&A alterando o `!inner join` para `left join` na tabela de inventário.

### 📊 Sprint 6.0 — Central de Relatórios e Alertas de Elite (2026-05-06)

**Objetivo:** Fortalecer o ecossistema com geração avançada de relatórios PDF na ponta do Lojista e instituir monitoramento High Alert no painel do administrador.

- [x] **Motor de PDF Local (Zero INP):** Geração do relatório de "Vendas do Dia" via biblioteca `jsPDF` inteiramente no lado do cliente. Operação englobada por `startTransition` assegurando UI responsiva e download instantâneo de um documento estilizado.
- [x] **Agendamento Multi-tenant:** Integração de `react-hook-form` e `zod` para criar um seletor amigável de horários e dias da semana. Migração `report_schedules` criada com RLS atrelando rigorosamente cada agendamento ao `auth.uid()`.
- [x] **Monitoramento Nível 4 (High Alert):** Ampliação do `DashboardLayout.tsx` para interceptar eventos globais via Supabase Realtime tanto em `INSERT` quanto `UPDATE`. Se o `payment_status` de uma venda virar 'paid' e exceder $1000, um Toast ambar exclusivo com alerta sonoro e click handler desponta na tela.
- [x] **Auditoria Completa:** Gravação minuciosa no `app_logs` de todas as vezes que um PDF for extraído ou o agendamento for configurado.

### 🌐 Sprint 7.0 — Broadcast, Observabilidade e Context Switcher (2026-05-06)

**Objetivo:** Implementar o Centro de Comunicação Global (Broadcast), o Dashboard de Observabilidade (CWV), e o Seletor de Contexto Multi-Store para lojistas com múltiplas lojas.

- [x] **Centro de Transmissão Global (`AdminBroadcast.tsx`):** Nova aba "Comunicação" no módulo Admin. Interface com seletores de audiência ("Todos", "Lojistas", "Entregadores"), composição de mensagem, canal (In-App/Email/Ambos) e URL de ação. O botão "Enviar Broadcast" insere na tabela `admin_broadcasts` (já existente com Realtime habilitado) e estima o alcance via contagem real de profiles.
- [x] **Dashboard de Observabilidade CWV (`PerformanceHub.tsx`):** Integrado como sub-seção do BiDashboard. Consome `app_logs` onde `source = 'cwv'` e `level = 'metric'`. Exibe gráficos LineChart (Recharts) para LCP, INP e CLS com Reference Lines para thresholds Google (Good/Poor). Inclui filtro de conexão (4G/Wi-Fi) e dispositivos lentos (<4GB RAM). Scorecard P75 com cores semafóricas.
- [x] **Multi-Store Switcher:** Hook `useStoreContext` transformado em `StoreProvider` (React Context Provider). Busca *todas* as lojas do owner. Se `stores.length > 1`, exibe dropdown no header do Merchant Hub. Ao trocar, todos os dados (Inventário, BI, Suporte) refetcham automaticamente via TanStack Query key dependency.
- [x] **Refatoração de Imports:** Todos os consumidores de `useStoreContext` foram migrados de `@/modules/merchant/hooks/useStoreContext` para `@/modules/merchant/context/StoreContext`.
- [x] **Audit Logging:** Broadcast registra ação `create_broadcast` com alcance estimado em `app_logs`.

**Arquivos criados:**
- `src/modules/merchant/context/StoreContext.tsx` — StoreProvider + useStoreContext hook
- `src/modules/admin/components/AdminBroadcast.tsx` — Centro de Transmissão Global
- `src/modules/bi/components/PerformanceHub.tsx` — Dashboard CWV

**Arquivos modificados:**
- `src/App.tsx` — StoreProvider envolvendo DashboardLayout
- `src/repositories/adminRepository.ts` — createBroadcast, getEstimatedReach, getPerformanceLogs
- `src/modules/admin/pages/AdminPage.tsx` — Tab "Comunicação" adicionada
- `src/modules/bi/pages/BiDashboard.tsx` — Seção PerformanceHub integrada
- `src/modules/merchant/pages/MerchantHubPage.tsx` — StoreSwitcher no header
- `src/modules/merchant/components/*.tsx` — Imports migrados para StoreContext

*Atualizar este arquivo após cada sprint com novas decisões e alterações.*

### 📦 Sprint 8.0 — Gestão de Pedidos, DC-e PDF & Auditoria Financeira (2026-05-06)

**Objetivo:** Implementar o módulo de Gestão de Pedidos para lojistas (incluindo geração de DC-e em PDF) e a Central de Auditoria Financeira para o SuperAdmin, com Central de Disputas/Chat e governança Np1.

- [x] **Central de Pedidos (MerchantOrders.tsx):** Nova aba "Pedidos" no Merchant Hub. Query TanStack com JOIN (`profiles` + `order_items`). Cards de pedido com dados do comprador, itens, total e status badge colorido. Handlers de status com loader inline, `toast.success` e invalidação de query via TanStack (zero refresh).
- [x] **Handlers de Status:** Botão "Preparar" (`status → 'preparing'`) e "Pronto para Coleta" (`status → 'searching_courier'`) com `useMutation`, loader no botão durante transação e feedback visual imediato.
- [x] **DC-e PDF (Declaração de Conteúdo):** Botão "Gerar DC-e" em pedidos pagos. PDF gerado via `jsPDF` + `jspdf-autotable` contendo: dados do remetente (loja), destinatário (comprador), lista de itens com quantidades e preços, totais e rodapé legal brasileiro (Convênio S/Nº de 1970).
- [x] **Hub de Auditoria Financeira (FinancialAudit.tsx):** Nova aba "Pagamentos" no módulo Admin (SuperAdmin). Lista pedidos `payment_status = 'paid'` com badge `payout_released`. Cards KPI: GTV Pago, Repassados, Pendentes. Tabela com colunas: Pedido, Loja, Valor, Taxa, Repasse, Data, Ações.
- [x] **Botão "Forçar Repasse":** ConfirmDialog glassmorphism de segurança. Chamada à Edge Function `release-payout` passando `order_id`. Se retorno 200, marca visualmente como "Repassado" e grava log em `app_logs`.
- [x] **Central de Disputas (OrderDisputeLogs.tsx):** Modal ScrollArea carregando mensagens da tabela `order_messages` filtradas por `order_id`. Exibição em formato de chat com bolhas coloridas por role (Comprador, Vendedor, Suporte, Sistema).
- [x] **Order Repository (Np1 Desacoplamento):** `orderRepository.ts` dedicado com isolamento multi-tenant. Usa `supabase` (RLS) para merchant e `supabaseAdmin` (bypass RLS) para auditoria. Métodos: `getOrders`, `updateOrderStatus`, `getOrderMessages`, `getAuditOrders`, `forceReleasePayout`, `getStoreInfo`.
- [x] **Zero CLS:** `OrderCardSkeleton` (cards de pedido, minHeight: 220px) e `OrderTableSkeleton` (tabela de auditoria com 3 KPI cards + 7 colunas) adicionados ao `Skeleton.tsx`.
- [x] **Audit Log:** Ações de mudança de status e geração de DC-e registradas em `app_logs` com `store_id`, `entity` e detalhes da operação.
- [x] **Types Expandidos:** `Order` com `payment_status`, `payout_released`, `platform_fee`, `searching_courier`, buyer joined fields. Nova interface `OrderMessage` para chat de disputas.

**Arquivos criados:**
- `src/repositories/orderRepository.ts` — Repositório dedicado de pedidos
- `src/modules/merchant/components/MerchantOrders.tsx` — Central de Pedidos do Lojista
- `src/modules/admin/components/FinancialAudit.tsx` — Hub de Auditoria Financeira
- `src/modules/admin/components/OrderDisputeLogs.tsx` — Central de Disputas/Chat

**Arquivos modificados:**
- `src/shared/types.ts` — `Order` expandida + `OrderMessage` interface
- `src/components/Skeleton.tsx` — `OrderCardSkeleton` + `OrderTableSkeleton`
- `src/modules/merchant/pages/MerchantHubPage.tsx` — Tab "Pedidos" adicionada
- `src/modules/admin/pages/AdminPage.tsx` — Tab "Pagamentos" adicionada

### 🧩 Sprint 9.0 — Migração Completa dos Módulos Administrativos (2026-05-08)

**Objetivo:** Completar a migração arquitetural dos módulos operacionais primários (`Plants`, `Affiliates`, `Installs`, `Staff`, `Publicidade`, e `Admin/Sales`) do aplicativo nativo `petalapp` para o dashboard autônomo `petalapanel`, unificando as operações administrativas.

- [x] **Repositório Desacoplado:** Módulos portados consumindo o cliente `supabaseAdmin` para ações sensíveis de super usuário via Service Role (ex: atualizar roles de Staff via `updateUserRole`).
- [x] **Módulos Migrados:** `PlantsManagement`, `AdminAffiliateProducts`, `InstallsManagement` (Heartbeat), `AdminStaffPanel`, `AdminAdvertisingPanel` (Publicidade Ads v2) e `AdminSales` (Configurações de Venda).
- [x] **Adequação UI/UX:** Integração das novas telas como *Tabs* horizontais dentro do `AdminPage.tsx` utilizando a interface `glassmorphism`, `lucide-react` e garantindo renderização assíncrona (startTransition) e proteção RBAC rigorosa.
- [x] **Limpeza do App Nativo:** Extirpação completa das importações, arquivos (`AdminSales.tsx`, `AdminAffiliateProducts.tsx`, etc) e blocos de renderização do `Admin.tsx` original do `petalapp`, aliviando significativamente o peso do build do app nativo.
- [x] **Mocks Shadcn Isolados:** Criação de componentes UI dummy (`button`, `card`, `input`, `select`, `switch`, `checkbox`) dentro do diretório do painel para viabilizar o copy/paste de telas com milhares de linhas (como `AdminAdvertisingPanel`) preservando a consistência estilística do projeto sem precisar reconstruir o markup.

**Arquivos criados em `petalapanel`:**
- `src/repositories/affiliateRepository.ts`
- `src/modules/admin/components/PlantsManagement.tsx`
- `src/modules/admin/components/InstallsManagement.tsx`
- `src/modules/admin/components/AdminAffiliateProducts.tsx`
- `src/modules/admin/components/AdminStaffPanel.tsx`
- `src/modules/admin/components/AdminAdvertisingPanel.tsx`
- `src/modules/admin/components/AdminSales.tsx`

**Limpeza em `petalapp`:**
- Removidos 4 arquivos inteiros de componentes da pasta `/src/components` e `/src/pages`.
- `Admin.tsx` limpo das seções `plants`, `affiliates`, `heartbeat`, `staff`, `advertising`.
