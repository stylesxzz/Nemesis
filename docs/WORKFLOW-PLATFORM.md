# NEMESIS FLOW — Plano de evolução

Este documento descreve a transição do MVP NEMESIS AI para uma plataforma open source de automação visual. É um plano técnico, não uma declaração de que todos os recursos já estão implementados.

## Princípios

- TypeScript e Node.js como base do motor de automação.
- Interface visual no-code sem limitar usuários técnicos.
- Integrações modulares e extensíveis.
- Agentes de IA com ferramentas e permissões explícitas.
- Self-hosting, portabilidade e controle dos dados.
- Execução de código não confiável em workers isolados.
- Controle manual sempre disponível, mesmo quando a IA pode operar workflows.

## Organização sugerida do monorepo

~~~text
apps/
  web/                 # React + TypeScript + React Flow
  api/                 # Fastify: REST, auth, webhooks
  worker/              # Execução assíncrona de workflows
packages/
  workflow-schema/     # Tipos, validação e versionamento
  engine/              # Grafo, scheduler e runtime
  integrations/        # SDK e conectores oficiais
  ai/                  # Providers, agentes, tools e memory
  secrets/             # Criptografia e vault
  observability/       # Logs, traces e eventos
runners/
  javascript/          # Sandbox JS/TS
  python/              # Worker Python isolado
infra/
  docker/              # Compose, healthchecks e imagens
~~~

A estrutura é uma proposta para a migração; deve ser ajustada após inventário do código existente.

## Contrato mínimo de um workflow

Um workflow precisa ter identificador estável, versão, estado, nós e arestas. Cada nó declara tipo, parâmetros validados e portas de entrada/saída. Cada execução registra workflow/version, status, timestamps e resultados por nó. Segredos são referenciados por ID, nunca embutidos no JSON exportável.

## Semântica do runtime

1. Validar schema, nós, conexões e dependências.
2. Criar execução imutável apontando para uma versão do workflow.
3. Agendar nós cujas dependências foram satisfeitas.
4. Aplicar timeout, retry/backoff e limites por nó.
5. Persistir estado e eventos de execução.
6. Permitir pause, resume, cancel e replay seguro quando suportado.
7. Registrar logs redigidos e resultados inspecionáveis.

## Catálogo de conectores

Cada pacote de integração deve fornecer manifesto, versão, documentação, esquema de credenciais, operações, triggers, actions, rate limits e testes. OpenAPI deve acelerar a cobertura de APIs sem prometer suporte nativo perfeito para qualquer serviço.

## Execução manual e por IA

- Manual: botão Run/Test, pause, resume e cancel na interface.
- Automática: webhook, agenda e gatilhos de serviços.
- Assistida por IA: agente pode propor ou executar operações dentro de um conjunto de permissões.
- Ações administrativas de infraestrutura: escopo separado e aprovação humana por padrão.

## Docker e inicialização

- Docker Compose define serviços e volumes persistentes.
- Containers usam healthchecks e política restart unless-stopped ou política adequada ao serviço.
- O daemon Docker é iniciado pelo sistema operacional (systemd ou Docker Desktop).
- A plataforma não deve iniciar comandos privilegiados sem consentimento do operador.
- Comandos manuais de operação devem permanecer disponíveis.

## Marcos

- [ ] Fundação TypeScript/Node e contratos.
- [ ] Editor visual e persistência de workflows.
- [ ] Runtime com execução e histórico.
- [ ] Webhooks e agendador.
- [ ] SDK e primeiros conectores oficiais.
- [ ] Workers isolados JavaScript e Python.
- [ ] Agentes de IA e aprovação humana.
- [ ] Compose de produção, backups e observabilidade.
