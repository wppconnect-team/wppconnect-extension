import React, { ChangeEvent, Component, DragEvent } from 'react';
import Button from '../atoms/Button';
import { ControlInput, ControlSelect } from '../atoms/ControlFactory';
import Box from '../molecules/Box';

type ButtonRow = { id: number, type: string, value: string, text: string };
type MessageButtonsFormState = {
    buttons: ButtonRow[],
    draggedIndex: number | null,
    dropIndex: number | null,
    pendingDeleteId: number | null
};

export default class MessageButtonsForm extends Component<{ className?: string }, MessageButtonsFormState>{
    constructor(props: { className?: string }) {
        super(props);
        this.state = {
            draggedIndex: null,
            dropIndex: null,
            pendingDeleteId: null,
            buttons: []
        };
    }

    messageButtonsFormTitle = chrome.i18n.getMessage('messageButtonsFormTitle');
    addButtonLabel = chrome.i18n.getMessage('addButtonLabel');
    importantNoteMessageButtonsForm = chrome.i18n.getMessage('importantNoteMessageButtonsForm');
    listTitleNoteMessageButtonsForm = chrome.i18n.getMessage('listTitleNoteMessageButtonsForm');
    firstListItemNoteMessageButtonsForm = chrome.i18n.getMessage('firstListItemNoteMessageButtonsForm', ['<strong>', '</strong>']);
    secondListItemNoteMessageButtonsForm = chrome.i18n.getMessage('secondListItemNoteMessageButtonsForm', ['<strong>', '</strong>']);
    thirdListItemNoteMessageButtonsForm = chrome.i18n.getMessage('thirdListItemNoteMessageButtonsForm', ['<strong>', '</strong>']);
    typeLabelMessageButtonsForm = chrome.i18n.getMessage('typeLabelMessageButtonsForm');
    valueLabelMessageButtonsForm = chrome.i18n.getMessage('valueLabelMessageButtonsForm');
    textLabelMessageButtonsForm = chrome.i18n.getMessage('textLabelMessageButtonsForm');
    urlTypeMessageButtonsForm = chrome.i18n.getMessage('urlTypeMessageButtonsForm');
    phoneNumberTypeMessageButtonsForm = chrome.i18n.getMessage('phoneNumberTypeMessageButtonsForm');
    idTypeMessageButtonsForm = chrome.i18n.getMessage('idTypeMessageButtonsForm');
    emptyButtonsLabel = chrome.i18n.getMessage('emptyButtonsLabel') || 'No buttons configured';
    buttonLimitLabel = chrome.i18n.getMessage('buttonLimitLabel') || 'Up to 3 buttons';
    deleteButtonLabel = chrome.i18n.getMessage('deleteButtonLabel') || 'Delete';
    deleteButtonConfirmLabel = chrome.i18n.getMessage('deleteButtonConfirmLabel') || 'Delete this button?';
    dragButtonLabel = chrome.i18n.getMessage('dragButtonLabel') || 'Drag';

    componentDidMount() {
        chrome.storage.local.get({ buttons: [] }, data => this.setState({
            buttons: data.buttons.map((button: { [key: string]: string }) => {
                const [type = ''] = Object.keys(button).filter(
                    (prop) => !['text'].includes(prop)
                );
                return {
                    id: type === 'id' ? +button[type] || Math.floor(Math.random() * 1000) : Math.floor(Math.random() * 1000),
                    type: type,
                    value: button[type] || '',
                    text: button.text
                };
            })
        }));
    }

    compareArrays = (arr1: ButtonRow[], arr2: ButtonRow[]) => {
        if (arr1.length !== arr2.length) {
            return false;
        }
        for (let i = 0; i < arr1.length; i++) {
            let obj1 = arr1[i];
            let obj2 = arr2[i];
            if (!obj2) {
                return false;
            }
            if (obj1.id !== obj2.id || obj1.type !== obj2.type || obj1.value !== obj2.value || obj1.text !== obj2.text) {
                return false;
            }
        }
        return true;
    }

    componentDidUpdate(prevProps: Readonly<{ className?: string }>, prevState: Readonly<MessageButtonsFormState>, snapshot?: any) {
        const { buttons } = this.state;
        if (!this.compareArrays(prevState.buttons, buttons)) {
            chrome.storage.local.set({
                buttons: buttons.map(button => ({
                    [button.type]: button.value,
                    text: button.text
                }))
            });
        }
    }

    handleDrag = (event: DragEvent<HTMLDivElement>, index: number) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `${index}`);
        this.setState({ draggedIndex: index });
    }

    handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
        event.preventDefault();
        this.setState({ dropIndex: index });
    }

    handleDrop = (event: DragEvent<HTMLDivElement>, index: number) => {
        event.preventDefault();
        const sourceIndex = event.dataTransfer.getData('text');
        const buttons = [...this.state.buttons];
        const [draggedItem] = buttons.splice(+sourceIndex, 1);
        buttons.splice(index, 0, draggedItem);
        this.setState({ buttons, draggedIndex: null, dropIndex: null });
    }

    handleTypeChange = (event: ChangeEvent<HTMLSelectElement>, id: number) => {
        this.setState({
            buttons: this.state.buttons.map(button => {
                if (button.id !== id) return button;
                const type = event.target.value;
                let value = button.value || '';
                if (type === 'phoneNumber') {
                    value = value.replace(/\D/g, '');
                } else if (type === 'id') {
                    value = `${button.id}`;
                }
                return {
                    id: button.id || 0,
                    type,
                    value,
                    text: button.text || '',
                };
            })
        });
    }

    handleValueChange = (event: ChangeEvent<HTMLInputElement>, id: number) => {
        this.setState({
            buttons: this.state.buttons.map(button => {
                if (button.id !== id) return button;
                let value = event.target.value;
                if (button.type === 'phoneNumber') {
                    value = value.replace(/\D/g, '')
                } else if (button.type === 'id') {
                    value = `${button.id}`;
                }
                return {
                    id: button.id || 0,
                    type: button.type || '',
                    value: value,
                    text: button.text || '',
                };
            })
        });
    }

    handleTextChange = (event: ChangeEvent<HTMLInputElement>, id: number) => {
        this.setState({
            buttons: this.state.buttons.map(button => {
                if (button.id !== id) return button;
                return {
                    id: button.id || 0,
                    type: button.type || '',
                    value: button.value || '',
                    text: event.target.value,
                };
            })
        });
    }

    handleDeleteButton = (id: number) => {
        this.setState({ pendingDeleteId: id });
    }

    confirmDeleteButton = (id: number) => {
        this.setState({
            buttons: this.state.buttons.filter(button => button.id !== id),
            pendingDeleteId: null
        });
    }

    handleAddButton = () => {
        const buttons = [...this.state.buttons, {
            id: Math.floor(Math.random() * 1000000),
            type: 'url',
            value: '',
            text: ''
        }];
        this.setState({ buttons });
    }

    render() {
        const { buttons, draggedIndex, dropIndex, pendingDeleteId } = this.state;

        return <Box
            className={this.props.className}
            title={this.messageButtonsFormTitle}
            headerButtons={<div className="flex items-center gap-3">
                <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300 sm:inline-flex">{buttons.length}/3</span>
                <Button variant="secondary" type="button" disabled={buttons.length >= 3} onClick={this.handleAddButton} icon="+">{this.addButtonLabel}</Button>
            </div>}
            footer={<>
                <p className="mb-2 font-semibold text-amber-300">{this.importantNoteMessageButtonsForm}</p>
                <p>{this.listTitleNoteMessageButtonsForm}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li dangerouslySetInnerHTML={{ __html: this.firstListItemNoteMessageButtonsForm }} />
                    <li dangerouslySetInnerHTML={{ __html: this.secondListItemNoteMessageButtonsForm }} />
                    <li dangerouslySetInnerHTML={{ __html: this.thirdListItemNoteMessageButtonsForm }} />
                </ul>
            </>}>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-300">
                <span>{this.buttonLimitLabel}</span>
                <span className="font-mono">{buttons.length}/3</span>
            </div>
            {buttons.length === 0 && <div className="rounded-lg border border-dashed border-white/12 px-4 py-8 text-center text-sm text-slate-400">
                {this.emptyButtonsLabel}
            </div>}
            {buttons.length > 0 &&
                <div className="space-y-3">
                    {buttons.map((button, index) => (
                        <div
                            key={button.id}
                            draggable
                            onDragStart={event => this.handleDrag(event, index)}
                            onDragOver={event => this.handleDragOver(event, index)}
                            onDrop={event => this.handleDrop(event, index)}
                            className={[
                                'grid',
                                'gap-3',
                                'rounded-lg',
                                'border',
                                'border-white/10',
                                'bg-slate-950/35',
                                'p-3',
                                'shadow-[inset_0_1px_0_rgba(255,255,255,.04)]',
                                'lg:grid-cols-[2rem_10rem_minmax(0,1fr)_minmax(0,1fr)_auto]',
                                index === draggedIndex ? 'ring-2 ring-emerald-400' : '',
                                index === dropIndex ? 'border-dashed border-emerald-400' : ''
                            ].join(' ')}
                        >
                            <div className="flex items-center justify-center rounded-md bg-white/10 text-slate-400" title={this.dragButtonLabel}>::</div>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500">{this.typeLabelMessageButtonsForm}</span>
                                <ControlSelect value={button.type} onChange={event => this.handleTypeChange(event, button.id)}>
                                    <option value="url">{this.urlTypeMessageButtonsForm}</option>
                                    <option value="phoneNumber">{this.phoneNumberTypeMessageButtonsForm}</option>
                                    <option value="id">{this.idTypeMessageButtonsForm}</option>
                                </ControlSelect>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500">{this.valueLabelMessageButtonsForm}</span>
                                <ControlInput
                                    className={button.type === 'id' ? 'bg-slate-900/80 text-slate-500' : ''}
                                    type={button.type === 'phoneNumber' ? 'tel' : button.type === 'url' ? 'url' : 'text'}
                                    value={button.value}
                                    onChange={event => this.handleValueChange(event, button.id)}
                                    disabled={button.type === 'id'}
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500">{this.textLabelMessageButtonsForm}</span>
                                <ControlInput
                                    type="text"
                                    value={button.text}
                                    onChange={event => this.handleTextChange(event, button.id)}
                                />
                            </label>
                            <Button
                                variant="light"
                                type="button"
                                className="self-end text-rose-300"
                                onClick={() => this.handleDeleteButton(button.id)}
                            >
                                {this.deleteButtonLabel}
                            </Button>
                            {pendingDeleteId === button.id && <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100 lg:col-span-5">
                                <div className="font-semibold">{this.deleteButtonConfirmLabel}</div>
                                <div className="mt-3 flex justify-end gap-2">
                                    <Button variant="secondary" type="button" onClick={() => this.setState({ pendingDeleteId: null })}>
                                        {chrome.i18n.getMessage('cancelButtonLabel') || 'Cancel'}
                                    </Button>
                                    <Button variant="danger" type="button" onClick={() => this.confirmDeleteButton(button.id)}>
                                        {this.deleteButtonLabel}
                                    </Button>
                                </div>
                            </div>}
                        </div>
                    ))}
                </div>}
        </Box>;
    }
}
