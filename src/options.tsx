import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import LogTable from './components/organisms/LogTable';
import MessageButtonsForm from './components/organisms/MessageButtonsForm';
import MessageForm from './components/organisms/MessageForm';

class Options extends Component<{}, {}>{
  title = chrome.i18n.getMessage('optionsPageTitle') || 'Wppconnect settings';
  subtitle = chrome.i18n.getMessage('optionsPageSubtitle') || 'Prepare the message, delivery controls and send logs.';

  componentDidMount() {
    const body = document.querySelector('body');
    if (!body) return;
    body.classList.add('bg-slate-100');
    body.classList.add('dark:bg-slate-950');
    body.classList.add('text-slate-900');
    body.classList.add('dark:text-slate-100');
    body.style.minWidth = '48rem';
  }

  render() {
    return <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Wppconnect</p>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{this.title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{this.subtitle}</p>
      </header>
      <MessageForm />
      <MessageButtonsForm />
      <LogTable />
    </main>;
  }
}

createRoot(document.getElementById('root')!)
  .render(<Options />);
