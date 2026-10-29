# NEMESIS AI — Automação de Sistemas

> Assistente local-first para automação de sistemas, conversação por texto e voz, integração com NVIDIA API e workflows n8n. Identidade visual IGGYI: preto e verde neon (`#39FF14`).

[![Licença MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Estado do projeto

MVP em desenvolvimento, com interface React, backend FastAPI e integração NVIDIA configurável. A voz utiliza recursos do navegador quando disponíveis. As ações do sistema devem permanecer limitadas às ferramentas permitidas pelo backend; o projeto não executa comandos de terminal arbitrários e não é destinado a pentest.

## Identidade visual

A imagem abaixo está incorporada diretamente nesta documentação para aparecer como imagem renderizada, em vez de exibir apenas um link para o arquivo SVG.

![Referência visual IGGYI e conceito de interface NEMESIS AI](https://raw.githubusercontent.com/stylesxzz/Nemesis/main/docs/images/iggyi-nemesis-brand-reference.svg)

*Conceito visual de referência — não é uma captura de tela de uma versão executável.*

## Arquitetura do sistema

![Diagrama visual da arquitetura NEMESIS AI com NVIDIA API, n8n, backend e agentes](https://raw.githubusercontent.com/stylesxzz/Nemesis/main/docs/images/nemesis-architecture.svg)

*Diagrama conceitual. Os agentes Windows e Android/Termux estão planejados e não são instalados automaticamente nesta versão.*

Os arquivos SVG originais também podem ser abertos individualmente:
- [Abrir referência visual IGGYI (SVG)](docs/images/iggyi-nemesis-brand-reference.svg)
- [Abrir diagrama de arquitetura (SVG)](docs/images/nemesis-architecture.svg)

## Requisitos

- Python 3.11 ou mais recente
- Node.js 20 ou mais recente (inclui npm)
- Chave NVIDIA API para respostas da IA
- Docker Compose opcional, para executar o n8n

## Instalação rápida — Linux, Kali Linux ou Termux

Clone o repositório primeiro. Os comandos a seguir partem da pasta criada pelo próprio Git:

```bash
git clone https://github.com/stylesxzz/Nemesis.git
cd Nemesis

python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt

cp .env.example .env
npm install
```

Edite o arquivo `.env` e preencha `NVIDIA_API_KEY` com sua chave privada. Obtenha uma chave no [NVIDIA Build](https://build.nvidia.com/). O valor de `NVIDIA_MODEL` pode precisar ser ajustado para um modelo habilitado na sua conta.

### Iniciar o sistema

Abra dois terminais na pasta `Nemesis`.

**Terminal 1 — backend:**

```bash
source .venv/bin/activate
uvicorn backend.app:app --host 127.0.0.1 --port 8765
```

**Terminal 2 — interface:**

```bash
npm run dev
```

Abra o endereço local informado pelo Vite (normalmente http://127.0.0.1:5173).

### Windows (PowerShell)

Clone o repositório e entre na pasta:

```powershell
git clone https://github.com/stylesxzz/Nemesis.git
Set-Location Nemesis

py -3 -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
npm install
```

Edite `.env` e configure `NVIDIA_API_KEY`. Em um primeiro terminal, inicie o backend:

```powershell
.\\.venv\\Scripts\\Activate.ps1
uvicorn backend.app:app --host 127.0.0.1 --port 8765
```

Em um segundo terminal, na pasta do projeto, execute `npm run dev` e abra o endereço mostrado.

## n8n opcional

Se o Docker estiver instalado e em execução, na raiz do repositório execute:

```bash
docker compose up -d n8n
```

Acesse http://127.0.0.1:5678, crie um workflow com o nó Webhook e configure `N8N_WEBHOOK_URL` no arquivo `.env`. Reinicie o backend depois de alterar as configurações.

## Voz

O microfone utiliza reconhecimento de fala disponível no navegador (Web Speech API), e as respostas podem ser lidas por síntese de voz. O suporte depende do navegador e do sistema. Voz offline ou contínua pode exigir motores STT/TTS adicionais.

## Controle do sistema e segurança

- Mantenha a chave NVIDIA no backend, nunca no frontend.
- Para uso local, mantenha o backend vinculado a `127.0.0.1`.
- Não execute texto arbitrário gerado pela IA como comando de shell.
- No Linux, o controle de volume depende da disponibilidade de `wpctl` ou `pactl`.
- Configure permissões explícitas e confirmação do usuário antes de habilitar ações sensíveis.
- Não exponha o backend ou o n8n diretamente à internet sem autenticação, TLS e controles de acesso.
- Os agentes Windows e Android/Termux são planejados; não são instalados automaticamente nesta versão.

## Verificar a compilação

```bash
npm run build
```

## Licença

Este projeto é distribuído sob a licença MIT. Leia o arquivo [LICENSE](LICENSE). As dependências de terceiros mantêm suas próprias licenças.
