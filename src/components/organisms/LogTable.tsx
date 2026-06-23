import React, { Component, MouseEvent } from 'react';
import type Log from '../../types/Log';
import Button from '../atoms/Button';
import Box from '../molecules/Box';

export default class LogTable extends Component<{ className?: string }, { logs: Log[] }>{
    constructor(props: { className?: string }) {
        super(props);
        this.state = {
            logs: []
        };
    }

    logTableTitle = chrome.i18n.getMessage('logTableTitle');
    numberLogTableTitle = chrome.i18n.getMessage('numberLogTableTitle');
    messageLogTableTitle = chrome.i18n.getMessage('messageLogTableTitle');
    attachmentLogTableTitle = chrome.i18n.getMessage('attachmentLogTableTitle');
    datetimeLogTableTitle = chrome.i18n.getMessage('datetimeLogTableTitle');
    updateButtonLabel = chrome.i18n.getMessage('updateButtonLabel');
    cleanButtonLabel = chrome.i18n.getMessage('cleanButtonLabel');
    emptyLogsLabel = chrome.i18n.getMessage('emptyLogsLabel') || 'No logs yet';
    yesLabel = chrome.i18n.getMessage('yesLabel') || 'Yes';
    noLabel = chrome.i18n.getMessage('noLabel') || 'No';

    componentDidMount() {
        chrome.storage.local.get({ logs: [] }, data => this.setState({ logs: data.logs }));
    }

    handleClear = (event: MouseEvent<HTMLButtonElement>) => {
        chrome.storage.local.set({ logs: [] });
        this.setState({ logs: [] });
    }

    handleUpdate = (event: MouseEvent<HTMLButtonElement>) => {
        chrome.storage.local.get({ logs: [] }, data =>
            this.setState({ logs: data.logs })
        );
    }

    render() {
        const logLevelClass: { [key: number]: string } = {
            1: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100',
            2: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
            3: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
        };

        return <Box
            className={this.props.className}
            title={this.logTableTitle}
            headerButtons={<div className="flex justify-end gap-2">
                <Button
                    variant="secondary"
                    type="button"
                    onClick={this.handleUpdate}
                >{this.updateButtonLabel}</Button>
                <Button
                    variant="light"
                    type="button"
                    onClick={this.handleClear}
                >{this.cleanButtonLabel}</Button>
            </div>}>
            {this.state.logs.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {this.emptyLogsLabel}
            </div>}
            {this.state.logs.length > 0 && <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] border-separate border-spacing-y-2 text-sm">
                    <thead>
                        <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-1">{this.numberLogTableTitle}</th>
                            <th className="px-3 py-1">{this.messageLogTableTitle}</th>
                            <th className="px-3 py-1">{this.attachmentLogTableTitle}</th>
                            <th className="px-3 py-1">{this.datetimeLogTableTitle}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.logs.map((log, index) => (
                            <tr key={index} className={logLevelClass[log.level]}>
                                <td className="rounded-l-lg border-y border-l px-3 py-3 font-mono">{log.contact}</td>
                                <td className="border-y px-3 py-3">{log.message}</td>
                                <td className="border-y px-3 py-3">{log.attachment ? this.yesLabel : this.noLabel}</td>
                                <td className="rounded-r-lg border-y border-r px-3 py-3">{log.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>}
        </Box>;
    }
}
