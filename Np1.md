# Skill Np1.md (Namesis Protocol) — Princípios de Engenharia Universais

> Diretrizes canônicas de arquitetura, performance e governança aplicáveis a todos os projetos. Este documento define os padrões obrigatórios (Np1) para garantir escalabilidade global e performance de elite.

---

### Princípios gerais e obrigatórios.
   
- **Desacoplamento.
- **Performance.
- **Segurança.
- **Responsividade.
- **Escalabilidade. 
- **Modernidade.  
- **Inovação.  

---

### 🏛️ Seção 1 — Engenharia, Clean Code e Segurança (SOLID)

**Objetivo:** Garantir que o app seja desacoplado, seguro e profissional.

- **Desacoplamento (Repository Pattern):** A interface nunca acessa o banco de dados diretamente. Toda chamada deve passar por um Repository, isolando a persistência da UI.
- **Segurança de Tipos (TypeScript):** Uso obrigatório de interfaces estritas. Erros de tipagem são bloqueios de produção.
- **Idempotência SQL (Obrigatório):** Migrações devem ser executáveis infinitas vezes sem erros. Utilize sempre `IF NOT EXISTS` para colunas/tabelas e `DROP POLICY IF EXISTS` para políticas de segurança.
- **Princípios Gerais:** Desacoplamento, Performance, Segurança, Responsividade, Escalabilidade, Modernidade e Inovação.

---

### ⚡ Seção 2 — Performance e UX (Core Web Vitals 100/100)

**Objetivo:** Atingir métricas de elite (Padrão 100/100), priorizando a fluidez total.

- **LCP (Largest Contentful Paint):** Imagens de destaque devem possuir `fetchPriority="high"` e `loading="eager"`.
- **CLS (Cumulative Layout Shift):** Componentes dinâmicos devem possuir Skeleton loaders ou contêineres de altura fixa para evitar saltos de layout.
- **INP (Interaction to Next Paint):** Interações complexas devem usar `startTransition` para manter a thread principal livre.
- **Observabilidade:** Implementar logs de auditoria centralizados e monitoramento de métricas reais (CWV) capturadas dos dispositivos dos usuários.

---

### 📱 Seção 3 — Ambiente e Build (Prevenção de Erros)

**Objetivo:** Padronizar o build e evitar falhas de compilação modernas (AGP 9.0+).

- **Ambiente Local:** Windows 11 Pro com terminal **PowerShell** (Bash/SH proibido).
- **Manutenção de Build:**
    * Limpeza: `Remove-Item -Recurse -Force node_modules\.vite`.
    * **Android/Gradle:** Remova propriedades obsoletas como `android.builtInKotlin` e `android.newDsl`. Substitua `flatDir` por `fileTree`.
    * **Plugins:** Não aplique `org.jetbrains.kotlin.android` manualmente em versões AGP 9.0+.

---

### 🌐 Seção 4 — Governança, Privacidade e Globalização

**Objetivo:** Garantir conformidade jurídica (LGPD) e alcance global.

- **Soberania de Idiomas (i18n):** Proibição estrita de strings "hardcoded". Todas as mensagens devem residir em arquivos de tradução com detecção automática de idioma.
- **Privacidade (LGPD):** Opções de "Exportar Dados" (JSON) e "Excluir Conta" (Direito ao Esquecimento) devem estar acessíveis nas configurações.
- **Acessibilidade (a11y):** Uso de HTML semântico e rótulos `aria-label` obrigatórios em elementos de ícones.

---

### 💳 Seção 5 — Modelo de Negócio e Resiliência

**Objetivo:** Proteger as transações e garantir a continuidade operacional.

- **Modelo de Escrow:** Em sistemas de pagamento, reter valores em garantia e liberar o repasse apenas após a confirmação do serviço/entrega.
- **Resiliência de Conta:** Implementar lógica de recuperação automática de contas de pagamento (ex: Stripe) caso configurações de capacidades ou payouts falhem.

---

### 🔍 Seção 6 — Diagnóstico Rápido

- **Erro de Exportação:** Verifique se o serviço possui `export const serviceName = { ... }`.
- **Stall (Travamento):** Geralmente causado por payloads de imagem pesados; reduza o tamanho no cliente antes do upload.
- **Erro 400 (Checkout/Edge):** Indica dados rejeitados (estoque, endereço ou falha em itens do pedido).

---

### 🚀 Seção 7 — Entrega de Código E2E (End-to-End)

- **Diretriz de Soberania Funcional: Deve obrigatoriamente entregar o código E2E (End-to-End) desde a primeira interação, eliminando a redundância e o desperdício de tokens por retrabalho.

- **Prontidão Operacional: O código entregue deve ser funcionalmente completo, permitindo testes de fluxo de dados (Database -> API -> UI) imediatamente após o merge.
---

 ### 🛠️ Seção 8 — Arquitetura de Auto-Recuperação (Self-Healing)

- **Resiliência de Serviços: Implementar fallbacks inteligentes para falhas de rede ou de APIs de terceiros (IA, Maps, Pagamentos).

- **Auto-Correção de Estado: Em caso de erro na Edge Function, o sistema deve registrar o log em app_logs e oferecer ao usuário uma rota de recuperação automática (ex: botão de retry com novo token).
---

### 🧠 Seção 9 — Continuidade de Contexto Orientada a IA

- **Documentação Viva:** Documentação de Sprint: Manutenção obrigatória dos arquivos de contexto (CONTEXT.md e CLAUDE.md) ao final de cada sprint para garantir a consciência situacional perfeita do agente de IA.

- **Rastreabilidade de Decisões: Registrar proativamente as razões técnicas de mudanças estruturais para evitar regressões lógicas em sessões futuras.

### 📄 Seção 10: Blindagem de Qualidade (QA)

- **Objetivo: Garantir que novas funcionalidades não quebrem o que já está em produção (Zero Regressão).

- **Testes de Integração (Fluxos Críticos): É obrigatório o uso de Playwright ou Cypress para testar o fluxo de "Pagar e Liberar Payout" e "Login com RBAC".

- **Testes Unitários (Lógica de Negócio): Uso de Vitest para testar calculadoras de taxas, formatadores de telefone e parsers da IA.

- **Regra de Ouro: O agente só pode considerar uma Sprint concluída se os novos testes passarem com 100% de cobertura nos handlers criados.