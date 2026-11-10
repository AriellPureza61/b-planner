# 💅 B. Planner — Sistema PWA de Agendamento & Gestão de Estúdios

Aplicação web progressiva (**PWA**) para estúdios de beleza e nail designers, combinando uma Landing Page de alta conversão com agendamento interativo em tempo real e um painel administrativo mobile-first.

> **Nota de Portfólio:** Esta versão pública de demonstração já inicia pré-populada com agendamentos, clientes, horários e procedimentos fictícios para testes imediatos tanto na tela de agendamento quanto no `/admin`.

---

## 📺 Demonstração do Sistema

https://github.com/user-attachments/assets/demo-bplanner

<p align="center">
  <video src="https://github.com/AriellPureza61/b-planner/raw/main/docs/demo-bplanner.mp4" controls="controls" width="100%" style="max-height: 520px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
    Seu navegador não suporta a tag de vídeo. Você pode <a href="docs/demo-bplanner.mp4">baixar ou assistir o vídeo clicando aqui</a>.
  </video>
</p>

> 🎬 **Download direto:** [▶️ `docs/demo-bplanner.mp4` (Vídeo de Demonstração em Alta Definição)](docs/demo-bplanner.mp4)

---

## ✨ Funcionalidades Principais

- **📅 Agendamento Interativo em Tempo Real:** Cálculo automático de disponibilidade, tempo de procedimento + buffer de higienização e prevenção de conflito de agenda.
- **📱 Painel Admin Instalável (PWA):** Gestão da agenda do dia, aprovação de agendamentos, disparo de confirmação via WhatsApp, catálogo de serviços e resumo financeiro.
- **⚡ Sincronização Instantânea:** Atualização automática entre abas (`BroadcastChannel`) e suporte a persistência híbrida (Cloud / LocalStorage).

---

## 🛠️ Stack Tecnológica

- **Frontend:** React 19, Tailwind CSS v4, Lucide React, React Router v7
- **Backend / Sync:** Serverless API + Firebase Firestore / LocalStorage Fallback
- **Build & PWA:** Vite 8 + `vite-plugin-pwa`

---

## 🚀 Como Executar Localmente

```bash
git clone https://github.com/AriellPureza61/b-planner.git
cd b-planner
npm install
npm run dev
```
