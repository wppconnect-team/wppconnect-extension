import React, { ChangeEvent, Component, createRef } from 'react';
import { ControlInput } from '../atoms/ControlFactory';
import { getActiveLanguage } from '../../utils/i18n';

interface CountryCode {
    value: number;
    label: string;
}

const countryCodesByLanguage: Record<string, CountryCode[]> = {
    en: require('../../countryCodes.en.json'),
    pt_BR: require('../../countryCodes.pt.json')
};

const countryCodes = () => countryCodesByLanguage[getActiveLanguage()] || countryCodesByLanguage.en;
const defaultPrefix = () => getActiveLanguage() === 'pt_BR' ? 55 : 0;

export default class SelectCountryCode extends Component<{ options?: CountryCode[] }, {
    isOpen: boolean,
    searchValue: string,
    selectedValue: CountryCode | undefined,
    options: CountryCode[],
    filteredOptions: CountryCode[]
}> {
    constructor(props: { options?: CountryCode[] }) {
        super(props);
        this.defaultLabelSelectCountryCode = chrome.i18n.getMessage('defaultLabelSelectCountryCode');
        this.searchPlaceholder = chrome.i18n.getMessage('countryCodeSearchPlaceholder') || 'Search';
        this.emptyLabel = chrome.i18n.getMessage('countryCodeEmptyLabel') || 'No prefix found';
        const defaultOptions = [{ value: 0, label: this.defaultLabelSelectCountryCode }, ...countryCodes()];
        const { options = defaultOptions } = props;
        this.state = {
            isOpen: false,
            searchValue: '',
            selectedValue: options.find(option => option.value === defaultPrefix()),
            options,
            filteredOptions: options,
        };
    }

    wrapperRef = createRef<HTMLDivElement>();
    defaultLabelSelectCountryCode: string;
    searchPlaceholder: string;
    emptyLabel: string;

    toggleOpen = () => {
        this.setState(prevState => ({
            ...prevState,
            isOpen: !prevState.isOpen
        }));
    };

    handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        const searchValue = e.target.value.toLowerCase();
        const filteredOptions = this.state.options.filter((option) =>
            option.label.toLowerCase().includes(searchValue)
        );

        this.setState({ searchValue, filteredOptions });
    };

    handleSelect = (selectedValue: CountryCode) => {
        this.setState({ selectedValue, isOpen: false, searchValue: '', filteredOptions: this.state.options });
    };

    handleClickOutside = (e: MouseEvent) => {
        if (e.target instanceof Node && !this.wrapperRef.current?.contains(e.target)) {
            this.setState({ isOpen: false });
        }
    };

    componentDidMount() {
        document.addEventListener('mousedown', this.handleClickOutside);
        chrome.storage.local.get(
            { prefix: defaultPrefix() },
            data => {
                this.setState({ selectedValue: this.state.options.find(option => option.value === data.prefix) });
            });
    }

    componentDidUpdate(prevProps: Readonly<{ options?: CountryCode[] }>, prevState: Readonly<{
        isOpen: boolean,
        searchValue: string,
        selectedValue: CountryCode | undefined,
        options: CountryCode[],
        filteredOptions: CountryCode[]
    }>, snapshot?: any) {
        if (prevState.selectedValue !== this.state.selectedValue) {
            chrome.storage.local.set({ prefix: this.state.selectedValue?.value || 0 });
        }
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleClickOutside);
    }

    render() {
        const { isOpen, searchValue, selectedValue, filteredOptions } = this.state;

        return (
            <div className="relative select-none" ref={this.wrapperRef}>
                <button
                    className={[
                        'w-full',
                        'min-h-[2.75rem]',
                        'rounded-lg',
                        'border',
                        'border-white/10',
                        'bg-slate-950/35',
                        'px-3',
                        'py-2',
                        'text-left',
                        'text-sm',
                        'text-slate-100',
                        'shadow-[inset_0_1px_0_rgba(255,255,255,.04)]',
                        'transition',
                        'hover:border-emerald-400/40',
                        'focus:outline-none',
                        'focus:ring-2',
                        'focus:ring-emerald-500',
                    ].join(' ')}
                    type="button"
                    onClick={this.toggleOpen}
                    aria-expanded={isOpen}
                >
                    <span className="flex items-center justify-between gap-3">
                        <span className="truncate">{selectedValue ? selectedValue.label : this.defaultLabelSelectCountryCode}</span>
                        <span className={`text-xs text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>v</span>
                    </span>
                </button>
                {isOpen && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-2xl">
                        <div className="border-b border-white/10 p-2">
                            <ControlInput
                                type="text"
                                placeholder={this.searchPlaceholder}
                                value={searchValue}
                                onChange={this.handleSearch}
                            />
                        </div>
                        <ul className="max-h-64 overflow-auto py-1">
                            {filteredOptions.length ? (
                                filteredOptions.map((option) => (
                                    <li key={option.value}>
                                        <button
                                            className={`w-full px-3 py-2 text-left text-sm transition hover:bg-emerald-400/10 ${selectedValue === option ? 'bg-emerald-400/15 text-emerald-100' : 'text-slate-200'}`}
                                            type="button"
                                            onClick={() => this.handleSelect(option)}
                                        >
                                            {option.label}
                                        </button>
                                    </li>
                                ))
                            ) : (
                                <li className="px-3 py-3 text-sm text-slate-500">{this.emptyLabel}</li>
                            )}
                        </ul>
                    </div>
                )}
            </div >
        );
    }
}
