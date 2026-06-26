import React, { ChangeEvent, Component, createRef, MouseEvent } from 'react';
import type { Attachment } from '../../types/Attachment';
import Button from '../atoms/Button';
import { ControlTextArea } from '../atoms/ControlFactory';
import Box from '../molecules/Box';
import SelectCountryCode from '../molecules/SelectCountryCode';

export default class MessageForm extends Component<{ className?: string }, { message: string, attachment: Attachment, delay: number }>{
    constructor(props: { className?: string }) {
        super(props);
        this.defaultMessage = chrome.i18n.getMessage('defaultMessage');
        this.state = {
            message: this.defaultMessage,
            attachment: null,
            delay: 0
        };
    }

    fileRef = createRef<HTMLInputElement>();
    defaultMessage: string;
    titleMessageForm = chrome.i18n.getMessage('titleMessageForm');
    attachmentLabelMessageForm = chrome.i18n.getMessage('attachmentLabelMessageForm');
    cleanButtonLabel = chrome.i18n.getMessage('cleanButtonLabel');
    footerLabelMessageForm = chrome.i18n.getMessage('footerLabelMessageForm');
    footerSuggestionMessageForm = chrome.i18n.getMessage('footerSuggestionMessageForm');
    delayLabelMessageForm = chrome.i18n.getMessage('delayLabelMessageForm');
    countryCodePrefixMessageForm = chrome.i18n.getMessage('countryCodePrefixMessageForm');
    messageDraftLabel = chrome.i18n.getMessage('messageDraftLabel') || 'Message';
    selectedAttachmentLabel = chrome.i18n.getMessage('selectedAttachmentLabel') || 'Selected file';

    componentDidMount() {
        chrome.storage.local.get(
            { message: this.defaultMessage, attachment: null, delay: 0 },
            data => {
                this.setState({ message: data.message, attachment: data.attachment, delay: data.delay });
                if (data.attachment != null && this.fileRef.current !== null) {
                    fetch(data.attachment.url).then(response => response.blob()).then(blob => {
                        const myFile = new File([blob], data.attachment.name, {
                            type: data.attachment.type,
                            lastModified: data.attachment.lastModified,
                        });
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(myFile);
                        if (this.fileRef.current !== null) {
                            this.fileRef.current.files = dataTransfer.files;
                        }
                    });
                }
            });
    }

    componentDidUpdate(prevProps: Readonly<{ className?: string }>, prevState: Readonly<{ message: string, attachment: Attachment, delay: number }>, snapshot?: any) {
        const { message, attachment, delay } = this.state;

        if (prevState.message !== message) {
            chrome.storage.local.set({ message });
        }

        if (prevState.delay !== delay) {
            chrome.storage.local.set({ delay });
        }

        if (prevState.attachment?.url !== attachment?.url) {
            if (attachment == null) {
                chrome.storage.local.set({ attachment });
            } else {
                chrome.storage.local.set({
                    attachment: {
                        name: attachment.name,
                        type: attachment.type,
                        url: attachment.url,
                        lastModified: attachment.lastModified
                    }
                });
            }
        }
    }

    handleMessageChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({ message: event.target.value });
    }

    handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = ev => {
                if (ev.target === null || ev.target.result === null) return;
                this.setState({
                    attachment: {
                        name: file.name,
                        type: file.type,
                        url: ev.target.result,
                        lastModified: file.lastModified
                    }
                });
            };
            reader.readAsDataURL(file);
        } else {
            this.setState({ attachment: null });
        }
    }

    handleFileClear = (event: MouseEvent<HTMLButtonElement>) => {
        if (this.fileRef.current == null) return;
        this.fileRef.current.files = new DataTransfer().files;
        this.setState({ attachment: null });
    }

    render() {
        const { message, attachment } = this.state;

        return <Box
            className={this.props.className}
            title={this.titleMessageForm}
            footer={<>
                <p className="mb-1">{this.footerLabelMessageForm}</p>
                <p>{this.footerSuggestionMessageForm}</p>
            </>}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <label className="flex min-h-[14rem] flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-300">{this.messageDraftLabel}</span>
                    <ControlTextArea
                        className="min-h-[12rem] resize-y"
                        value={message}
                        onChange={this.handleMessageChange}
                    />
                </label>
                <div className="flex flex-col gap-3">
                    <label
                        htmlFor="attachment"
                        className="flex min-h-[12rem] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-slate-950/35 px-4 py-6 text-center transition hover:border-emerald-400/60 hover:bg-emerald-400/10"
                    >
                        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-lg font-bold text-emerald-300 shadow-sm">+</span>
                        <span className="text-sm font-semibold text-slate-100">
                            {attachment?.name ? this.selectedAttachmentLabel : this.attachmentLabelMessageForm}
                        </span>
                        {attachment?.name && <span className="mt-1 max-w-full truncate text-xs text-slate-500">{attachment.name}</span>}
                    </label>
                    <input
                        id="attachment"
                        name="attachment"
                        className="hidden"
                        type="file"
                        ref={this.fileRef}
                        onChange={this.handleFileChange}
                    />
                    {attachment != null &&
                        <Button
                            variant="danger"
                            type="button"
                            onClick={this.handleFileClear}
                        >{this.cleanButtonLabel}</Button>}
                </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <label className="flex flex-col gap-2">
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-300">
                        <span>{this.delayLabelMessageForm}</span>
                        <span className="rounded-full bg-white/10 px-2 py-1 font-mono text-xs text-slate-100">{this.state.delay.toFixed(1)}s</span>
                    </span>
                    <input
                        type="range"
                        id="delay"
                        name="delay"
                        min="0"
                        max="10"
                        step="0.1"
                        value={this.state.delay}
                        onChange={(e) => this.setState({ delay: +e.target.value })}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-emerald-500 outline-none"
                    />
                </label>
                <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-300">{this.countryCodePrefixMessageForm}</span>
                    <SelectCountryCode />
                </label>
            </div>
        </Box>;
    }
}
