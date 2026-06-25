import React, { ChangeEvent, Component } from 'react';
import { ControlInput } from '../atoms/ControlFactory';
import Box from '../molecules/Box';

const DEFAULT_ARCHIVE_DELAY_MS = 500;
const MIN_ARCHIVE_DELAY_MS = 0;
const MAX_ARCHIVE_DELAY_MS = 10000;
const STEP_ARCHIVE_DELAY_MS = 100;

export default class ArchiveForm extends Component<{ className?: string }, { archiveDelayMs: number }>{
    constructor(props: { className?: string }) {
        super(props);
        this.state = {
            archiveDelayMs: DEFAULT_ARCHIVE_DELAY_MS
        };
    }

    archiveFormTitle = chrome.i18n.getMessage('archiveFormTitle') || 'Archiving';
    archiveDelayLabel = chrome.i18n.getMessage('archiveDelayLabel') || 'Delay between archived chats';
    archiveDelayHelp = chrome.i18n.getMessage('archiveDelayHelp') || 'Used when archiving chats from the popup.';
    archiveFormFooter = chrome.i18n.getMessage('archiveFormFooter') || 'Only non-archived chats that WhatsApp allows archiving will be processed.';

    componentDidMount() {
        chrome.storage.local.get(
            { archiveDelayMs: DEFAULT_ARCHIVE_DELAY_MS },
            data => this.setState({ archiveDelayMs: this.normalizeDelay(data.archiveDelayMs) })
        );
    }

    componentDidUpdate(prevProps: Readonly<{ className?: string }>, prevState: Readonly<{ archiveDelayMs: number }>, snapshot?: any) {
        if (prevState.archiveDelayMs !== this.state.archiveDelayMs) {
            chrome.storage.local.set({ archiveDelayMs: this.state.archiveDelayMs });
        }
    }

    normalizeDelay = (value: number) => {
        if (Number.isNaN(value)) return DEFAULT_ARCHIVE_DELAY_MS;
        return Math.min(MAX_ARCHIVE_DELAY_MS, Math.max(MIN_ARCHIVE_DELAY_MS, Math.round(value / STEP_ARCHIVE_DELAY_MS) * STEP_ARCHIVE_DELAY_MS));
    }

    handleDelayChange = (event: ChangeEvent<HTMLInputElement>) => {
        this.setState({ archiveDelayMs: this.normalizeDelay(+event.target.value) });
    }

    render() {
        return <Box
            className={this.props.className}
            title={this.archiveFormTitle}
            footer={this.archiveFormFooter}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem]">
                <label className="flex flex-col gap-2">
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span>{this.archiveDelayLabel}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-100">{this.state.archiveDelayMs}ms</span>
                    </span>
                    <input
                        type="range"
                        min={MIN_ARCHIVE_DELAY_MS}
                        max={MAX_ARCHIVE_DELAY_MS}
                        step={STEP_ARCHIVE_DELAY_MS}
                        value={this.state.archiveDelayMs}
                        onChange={this.handleDelayChange}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600 outline-none dark:bg-slate-800"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{this.archiveDelayHelp}</span>
                </label>
                <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">ms</span>
                    <ControlInput
                        type="number"
                        min={MIN_ARCHIVE_DELAY_MS}
                        max={MAX_ARCHIVE_DELAY_MS}
                        step={STEP_ARCHIVE_DELAY_MS}
                        value={this.state.archiveDelayMs}
                        onChange={this.handleDelayChange}
                    />
                </label>
            </div>
        </Box>;
    }
}
