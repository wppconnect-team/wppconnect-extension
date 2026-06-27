import React, { ChangeEvent, Component } from 'react';
import Box from '../molecules/Box';
import { AppLanguage, detectBrowserLanguage, getActiveLanguage, normalizeLanguage, setLanguagePreference } from '../../utils/i18n';

export default class LanguageForm extends Component<{}, { language: AppLanguage }>{
    constructor(props: {}) {
        super(props);
        this.state = {
            language: getActiveLanguage()
        };
    }

    title = chrome.i18n.getMessage('languageSettingsTitle') || 'Language';
    help = chrome.i18n.getMessage('languageSettingsHelp') || 'The extension uses the browser language as the initial value. This choice controls extension screens from now on.';
    englishLabel = chrome.i18n.getMessage('languageEnglishLabel') || 'English';
    portugueseLabel = chrome.i18n.getMessage('languagePortugueseLabel') || 'Portuguese (Brazil)';

    componentDidMount() {
        const browserLanguage = detectBrowserLanguage();
        chrome.storage.local.get({ language: browserLanguage }, data => {
            const language = data.language === 'auto' ? browserLanguage : normalizeLanguage(data.language);
            if (data.language !== language) void setLanguagePreference(language);
            this.setState({ language });
        });
    }

    handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const language = normalizeLanguage(event.target.value);
        this.setState({ language });
        void setLanguagePreference(language).then(() => window.location.reload());
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
                    <option value="en">{this.englishLabel}</option>
                    <option value="pt_BR">{this.portugueseLabel}</option>
                </select>
            </label>
        </Box>;
    }
}
