from __future__ import annotations

import os
import platform
import shutil
import subprocess
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="NEMESIS AI Local Agent", version="0.1.0")
# Keep the service bound to localhost by default. Do not expose it to the public internet as-is.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "").strip()
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.3-nemotron-super-49b-v1")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
NVIDIA_MAX_TOKENS = int(os.getenv("NVIDIA_MAX_TOKENS", "2000"))
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "").strip()

SYSTEM_PROMPT = """Você é NEMESIS AI, um assistente em português especializado EXCLUSIVAMENTE em automação de sistemas.
Converse naturalmente por texto. A interface pode ler suas respostas em voz alta.
Ajude a automatizar tarefas legítimas no computador do próprio usuário: consultar estado do sistema,
ajustar volume por ferramenta explícita, e acionar workflows n8n configurados.
Nunca afirme que uma ação foi concluída sem resultado da ferramenta. Se uma ferramenta não existir,
explique como habilitá-la. Não invente acesso a dispositivos.
Você não pode executar comandos shell arbitrários escritos pelo usuário ou por você mesmo.
Use apenas as ferramentas disponíveis e validadas pelo backend. Antes de ações destrutivas,
alterações administrativas ou que possam interromper o sistema, explique o efeito e solicite confirmação.
Não revele variáveis de ambiente, chaves, segredos ou conteúdo de arquivos privados.
"""

TOOLS = [
    {"type": "function", "function": {"name": "system_status", "description": "Consultar informações básicas e não sensíveis do sistema local.", "parameters": {"type": "object", "properties": {}, "additionalProperties": False}}},
    {"type": "function", "function": {"name": "set_volume", "description": "Definir volume de saída de áudio do Linux entre 0 e 100. Disponível apenas se wpctl ou pactl estiver instalado.", "parameters": {"type": "object", "properties": {"percent": {"type": "integer", "minimum": 0, "maximum": 100}}, "required": ["percent"], "additionalProperties": False}}},
    {"type": "function", "function": {"name": "trigger_n8n", "description": "Enviar um pedido de automação ao webhook n8n configurado. Só use quando o usuário solicitar uma automação e o webhook estiver configurado.", "parameters": {"type": "object", "properties": {"task": {"type": "string", "minLength": 1, "maxLength": 500}}, "required": ["task"], "additionalProperties": False}}},
]

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=20)

def system_status() -> dict[str, Any]:
    return {
        "platform": platform.platform(),
        "system": platform.system(),
        "python": platform.python_version(),
        "agent": "online",
        "available_audio_tools": [x for x in ("wpctl", "pactl") if shutil.which(x)],
    }

def set_volume(percent: int) -> dict[str, Any]:
    if not 0 <= percent <= 100:
        return {"ok": False, "message": "Volume deve estar entre 0 e 100."}
    if platform.system() != "Linux":
        return {"ok": False, "message": "Controle de volume disponível neste MVP somente no Linux."}
    wpctl = shutil.which("wpctl")
    pactl = shutil.which("pactl")
    try:
        if wpctl:
            result = subprocess.run([wpctl, "set-volume", "@DEFAULT_AUDIO_SINK@", f"{percent}%"], capture_output=True, text=True, timeout=5, check=False)
        elif pactl:
            result = subprocess.run([pactl, "set-sink-volume", "@DEFAULT_SINK@", f"{percent}%"], capture_output=True, text=True, timeout=5, check=False)
        else:
            return {"ok": False, "message": "Não encontrei wpctl nem pactl. Instale/configure PipeWire ou PulseAudio para controlar o volume."}
        if result.returncode:
            return {"ok": False, "message": (result.stderr or "O sistema recusou a alteração de volume.").strip()[:300]}
        return {"ok": True, "message": f"Comando de volume enviado: {percent}%."}
    except subprocess.TimeoutExpired:
        return {"ok": False, "message": "O controle de áudio excedeu o tempo limite."}

async def trigger_n8n(task: str) -> dict[str, Any]:
    if not N8N_WEBHOOK_URL:
        return {"ok": False, "message": "n8n não configurado. Defina N8N_WEBHOOK_URL no .env."}
    if not N8N_WEBHOOK_URL.startswith(("http://127.0.0.1", "http://localhost", "https://")):
        return {"ok": False, "message": "URL do webhook não permitida. Use localhost ou HTTPS."}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(N8N_WEBHOOK_URL, json={"source": "nemesis-ai", "task": task})
        if response.is_success:
            return {"ok": True, "message": f"Pedido enviado ao n8n (HTTP {response.status_code})."}
        return {"ok": False, "message": f"n8n respondeu com HTTP {response.status_code}."}
    except httpx.HTTPError:
        return {"ok": False, "message": "Não foi possível conectar ao webhook n8n."}

async def execute_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    if name == "system_status":
        return {"ok": True, "tool": name, "message": f"Sistema {system_status()['system']} detectado.", "data": system_status()}
    if name == "set_volume":
        percent = args.get("percent")
        if isinstance(percent, bool) or not isinstance(percent, int) or not 0 <= percent <= 100:
            return {"ok": False, "tool": name, "message": "Percentual inválido."}
        result = set_volume(percent)
        return {"tool": name, **result}
    if name == "trigger_n8n":
        task = args.get("task")
        if not isinstance(task, str) or not task.strip() or len(task) > 500:
            return {"ok": False, "tool": name, "message": "Descrição da automação inválida."}
        result = await trigger_n8n(task.strip())
        return {"tool": name, **result}
    return {"ok": False, "tool": name, "message": "Ferramenta não permitida."}

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "platform": platform.system(),
        "nvidia_configured": bool(NVIDIA_API_KEY),
        "n8n_configured": bool(N8N_WEBHOOK_URL),
        "tools": [t["function"]["name"] for t in TOOLS],
    }

@app.get("/api/system/status")
async def get_system_status():
    return system_status()

@app.post("/api/chat")
async def chat(body: ChatRequest):
    if not NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="Configure NVIDIA_API_KEY no arquivo .env e reinicie o backend.")
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in body.history[-12:]:
        role = item.get("role")
        content = item.get("content")
        if role in ("user", "assistant") and isinstance(content, str):
            messages.append({"role": role, "content": content[:8000]})
    messages.append({"role": "user", "content": body.message})

    tool_results: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=75.0) as client:
            for _ in range(3):
                response = await client.post(
                    f"{NVIDIA_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {NVIDIA_API_KEY}", "Content-Type": "application/json"},
                    json={"model": NVIDIA_MODEL, "messages": messages, "tools": TOOLS, "tool_choice": "auto", "temperature": 0.2, "max_tokens": NVIDIA_MAX_TOKENS},
                )
                if response.is_error:
                    detail = response.text[:500]
                    raise HTTPException(status_code=502, detail=f"NVIDIA API respondeu HTTP {response.status_code}: {detail}")
                data = response.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                calls = message.get("tool_calls") or []
                if not calls:
                    return {"reply": message.get("content") or "A NVIDIA não retornou texto para esta solicitação.", "tool_results": tool_results}
                messages.append({"role": "assistant", "content": message.get("content"), "tool_calls": calls})
                for call in calls:
                    fn = call.get("function", {})
                    name = fn.get("name", "")
                    try:
                        import json
                        args = json.loads(fn.get("arguments") or "{}")
                        if not isinstance(args, dict):
                            args = {}
                    except (ValueError, TypeError):
                        args = {}
                    result = await execute_tool(name, args)
                    tool_results.append(result)
                    messages.append({"role": "tool", "tool_call_id": call.get("id", ""), "content": str(result)[:2000]})
            return {"reply": "A execução atingiu o limite de etapas desta solicitação. Revise os resultados e tente novamente.", "tool_results": tool_results}
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Falha de rede ao conectar à API NVIDIA.")
