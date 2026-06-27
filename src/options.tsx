import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ArchiveForm from './components/organisms/ArchiveForm';
import LanguageForm from './components/organisms/LanguageForm';
import LogTable from './components/organisms/LogTable';
import MessageButtonsForm from './components/organisms/MessageButtonsForm';
import MessageForm from './components/organisms/MessageForm';

class Options extends Component<{}, {}>{
  title = chrome.i18n.getMessage('optionsPageTitle') || 'Wppconnect settings';
  subtitle = chrome.i18n.getMessage('optionsPageSubtitle') || 'Prepare the message, delivery controls and send logs.';

  componentDidMount() {
    const body = document.querySelector('body');
    if (!body) return;
    body.classList.add('bg-slate-950');
    body.classList.add('text-slate-100');
    body.style.minWidth = '48rem';
  }

  render() {
    return <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,.20),transparent_30%),linear-gradient(135deg,#0b1220,#111827_54%,#07111c)] px-5 py-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-slate-900/50 px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_18px_60px_rgba(0,0,0,.18)]">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Wppconnect</p>
        <h1 className="text-2xl font-bold text-white">{this.title}</h1>
        <p className="text-sm text-slate-400">{this.subtitle}</p>
      </header>
      <LanguageForm />
      <MessageForm />
      <MessageButtonsForm />
      <ArchiveForm />
      <LogTable />
      </div>
    </main>;
  }
}

createRoot(document.getElementById('root')!)
  .render(<Options />);
