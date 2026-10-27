import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, AudioLines, Bot, CheckCircle2, ChevronDown, Command, Cpu, Headphones, Mic, MicOff, Monitor, Plus, Send, Settings2, ShieldCheck, Sparkles, Terminal, Volume2, Workflow, X } from "lucide-react";
import "./style.css";

const API = import.meta.env.VITE_API_BASE || "";
const initial = { id: 1, role: "assistant", content: "NEMESIS online. Posso ajudar a automatizar tarefas do seu sistema por texto ou voz. O que você quer fazer?", time: new Date() };

function App() {
  const [messages, setMessages] = useState([initial]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Conectando ao agente local…");
  const [health, setHealth] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    fetch(API + "/api/health").then(r => r.json()).then(d => {
      setHealth(d); setStatus(d.nvidia_configured ? "Agente local conectado" : "Agente local conectado · configure NVIDIA_API_KEY");
    }).catch(() => setStatus("Backend offline · inicie o servidor local"));
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); window.speechSynthesis?.cancel(); };
  }, []);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);

  const speak = (text) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const send = async (override) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    const userMsg = { id: Date.now(), role: "user", content: text, time: new Date() };
    setMessages(m => [...m, userMsg]); setInput(""); setBusy(true);
    try {
      const response = await fetch(API + "/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Falha na solicitação");
      const answer = { id: Date.now() + 1, role: "assistant", content: data.reply, time: new Date(), toolResults: data.tool_results || [] };
      setMessages(m => [...m, answer]);
      if (data.tool_results?.length) setTasks(t => [...data.tool_results, ...t].slice(0, 5));
      speak(data.reply);
    } catch (err) {
      setMessages(m => [...m, { id: Date.now() + 2, role: "assistant", content: "Não consegui concluir a solicitação. " + (err.message || "Verifique se o backend está em execução e se a API NVIDIA está configurada."), time: new Date(), error: true }]);
    } finally { setBusy(false); }
  };

  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(m => [...m, { id: Date.now(), role: "assistant", content: "Este navegador não oferece reconhecimento de fala. Você ainda pode digitar ou usar um navegador compatível com Web Speech API.", time: new Date() }]);
      return;
    }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SpeechRecognition();
    rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) send(transcript);
    };
    recognitionRef.current = rec; rec.start();
  };

  const quick = (text) => { setInput(text); };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><AudioLines size={21}/></div><div><b>NEMESIS<span> AI</span></b><small>SYSTEM AUTOMATION</small></div><button className="icon-btn mobile-close" onClick={() => document.body.classList.remove("menu-open")}><X size={17}/></button></div>
      <button className="new-chat" onClick={() => setMessages([ { ...initial, id: Date.now(), time: new Date() } ])}><Plus size={17}/> Nova conversa <span>⌘ K</span></button>
      <div className="side-label">WORKSPACE</div>
      <button className="nav-item active"><Bot size={17}/> Assistente <span className="live-dot"/></button>
      <button className="nav-item" onClick={() => setShowSettings(true)}><Workflow size={17}/> Automações n8n</button>
      <button className="nav-item" onClick={() => setShowSettings(true)}><Monitor size={17}/> Agentes conectados</button>
      <button className="nav-item" onClick={() => setShowSettings(true)}><Terminal size={17}/> Registro de tarefas</button>
      <div className="sidebar-bottom">
        <div className="agent-card"><div className="agent-card-head"><span className="live-dot"/><b>AGENTE LOCAL</b><span className="secure"><ShieldCheck size={14}/></span></div><p>{status}</p><div className="agent-meta"><span><span className="tiny-dot"/> Localhost</span><span>v0.1.0</span></div></div>
        <button className="nav-item" onClick={() => setShowSettings(true)}><Settings2 size={17}/> Configurações</button>
        <div className="profile"><div className="profile-avatar">N</div><div><b>NEMESIS</b><small>Personal workspace</small></div><ChevronDown size={15}/></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="top-title"><span className="crumb">Workspace</span><span className="slash">/</span><b>Assistente</b></div><div className="top-actions"><span className="system-pill"><span className="live-dot"/>{health ? "Sistema local" : "Verificando agente"}</span><button className="icon-btn" aria-label="Configurações" onClick={() => setShowSettings(true)}><Settings2 size={18}/></button></div></header>
      <section className="chat-scroll">
        <div className="welcome"><div className="orb-wrap"><div className={"orb " + (listening ? "listening" : "") + (speaking ? " speaking" : "")}><div className="orb-core"/><div className="orb-ring ring-one"/><div className="orb-ring ring-two"/></div><div className="orb-glow"/></div><div className="eyebrow"><span className="live-dot"/> SYSTEM ONLINE</div><h1>Em que posso <span>ajudar?</span></h1><p>Automatize seu sistema com linguagem natural.<br/>Digite ou fale. Eu cuido das etapas.</p></div>
        <div className="messages">{messages.length > 1 && messages.slice(1).map(m => <div className={"message-row " + m.role} key={m.id}><div className="message-avatar">{m.role === "assistant" ? <AudioLines size={16}/> : "U"}</div><div className="message-body"><div className="message-meta">{m.role === "assistant" ? "NEMESIS" : "VOCÊ"} <span>{m.time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div><div className={"bubble " + (m.error ? "error" : "")}>{m.content}</div>{m.toolResults?.map((t, i) => <div className="tool-result" key={i}><CheckCircle2 size={14}/><span>{t.message || t.tool || "Ação executada"}</span><small>{t.ok ? "CONCLUÍDO" : "FALHOU"}</small></div>)}</div></div>)}{busy && <div className="message-row assistant"><div className="message-avatar"><AudioLines size={16}/></div><div className="message-body"><div className="message-meta">NEMESIS <span>processando</span></div><div className="typing"><i/><i/><i/></div></div></div>}<div ref={bottomRef}/></div>
        {messages.length === 1 && <div className="suggestions"><button onClick={() => quick("Verifique o estado do sistema") }><Activity size={16}/><span><b>Diagnosticar sistema</b><small>Verificar o ambiente local</small></span></button><button onClick={() => quick("Quais automações n8n estão configuradas?")}><Workflow size={16}/><span><b>Gerenciar automações</b><small>Conectar seus workflows</small></span></button><button onClick={() => quick("Como posso controlar o volume do sistema?")}><Volume2 size={16}/><span><b>Controlar dispositivos</b><small>Áudio, microfone e monitores</small></span></button></div>}
      </section>
      <footer className="composer-wrap"><div className="composer"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={listening ? "Estou ouvindo…" : "Peça para automatizar algo no seu sistema…"} rows={1} aria-label="Mensagem para NEMESIS"/><div className="composer-tools"><div className="composer-hints"><span><Command size={12}/> Enter para enviar</span><span>·</span><span>Shift + Enter nova linha</span></div><div className="composer-buttons"><button className={"icon-btn mic-btn " + (listening ? "recording" : "")} onClick={toggleMic} title={listening ? "Parar microfone" : "Falar com NEMESIS"}>{listening ? <MicOff size={17}/> : <Mic size={17}/>}</button><button className="send-btn" onClick={() => send()} disabled={!input.trim() || busy} aria-label="Enviar"><Send size={16}/></button></div></div></div><div className="footer-note"><ShieldCheck size={12}/> Agente local · Ações restritas por permissões <span>•</span> <button onClick={() => setVoiceEnabled(v => !v)}>{voiceEnabled ? "Voz ativada" : "Voz desativada"}</button></div></footer>
    </main>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="settings-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">CONFIGURAÇÃO</span><h2>Conexões do sistema</h2></div><button className="icon-btn" onClick={() => setShowSettings(false)}><X size={18}/></button></div><div className="setting-row"><div className="setting-icon"><Cpu size={18}/></div><div><b>NVIDIA AI</b><p>{health?.nvidia_configured ? "Chave detectada no backend" : "Configure NVIDIA_API_KEY no .env do backend"}</p></div><span className={health?.nvidia_configured ? "tag good" : "tag"}>{health?.nvidia_configured ? "CONECTADO" : "CONFIGURAR"}</span></div><div className="setting-row"><div className="setting-icon"><Workflow size={18}/></div><div><b>n8n</b><p>{health?.n8n_configured ? "Webhook configurado" : "Configure N8N_WEBHOOK_URL no .env"}</p></div><span className={health?.n8n_configured ? "tag good" : "tag"}>{health?.n8n_configured ? "CONECTADO" : "OPCIONAL"}</span></div><div className="setting-row"><div className="setting-icon"><Terminal size={18}/></div><div><b>Agente local</b><p>{health?.platform || "Aguardando backend"}</p></div><span className="tag good">LOCAL</span></div><div className="setting-note"><ShieldCheck size={17}/><p>Chaves de API permanecem no backend. O agente não executa comandos arbitrários da IA; as ferramentas disponíveis são validadas no servidor.</p></div><button className="primary-wide" onClick={() => setShowSettings(false)}>Concluído</button></section></div>}
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);