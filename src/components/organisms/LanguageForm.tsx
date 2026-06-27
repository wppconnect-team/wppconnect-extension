import React, { ChangeEvent, Component } from 'react';
import Box from '../molecules/Box';

type Language = 'auto' | 'en' | 'pt_BR';

const browserLanguage = (): Language => chrome.i18n.getUILanguage() === 'pt_BR' ? 'pt_BR' : 'en';

export default class LanguageForm extends Component<{}, { language: Language }>{
    constructor(props: {}) {
        super(props);
        this.state = {
            language: 'auto'
        };
    }

    title = chrome.i18n.getMessage('languageSettingsTitle') || 'Language';
    help = chrome.i18n.getMessage('languageSettingsHelp') || 'The default follows the browser language. Change it here for extension screens that support manual language preference.';
    autoLabel = `${chrome.i18n.getMessage('languageAutoLabel') || 'Automatic'} (${browserLanguage()})`;
    englishLabel = chrome.i18n.getMessage('languageEnglishLabel') || 'English';
    portugueseLabel = chrome.i18n.getMessage('languagePortugueseLabel') || 'Portuguese (Brazil)';

    componentDidMount() {
        chrome.storage.local.get({ language: 'auto' }, data => this.setState({ language: data.language || 'auto' }));
    }

    handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const language = event.target.value as Language;
        this.setState({ language });
        chrome.storage.local.set({ language, resolvedLanguage: language === 'auto' ? browserLanguage() : language });
    }

    render() {
        return <Box title={this.title} footer={this.help}>
            <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-300">{this.title}</span>
                <select
                    value={this.state.language}
                    onChange={this.handleLanguageChange}
                    className="min-h-[2.75rem] rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="auto">{this.autoLabel}</option>
                    <option value="en">{this.englishLabel}</option>
                    <option value="pt_BR">{this.portugueseLabel}</option>
                </select>
            </label>
        </Box>;
    }
}
