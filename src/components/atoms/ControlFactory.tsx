import React, { Component, ComponentClass } from 'react';

type ControlType = 'input' | 'textarea' | 'select';

type ControlPropsMap = {
    input: React.InputHTMLAttributes<HTMLInputElement>,
    textarea: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    select: React.SelectHTMLAttributes<HTMLSelectElement>,
};

class ControlFactory {
    static create<T extends ControlType>(type: T): ComponentClass<ControlPropsMap[T]> {
        return class CustomInput extends Component<ControlPropsMap[T], {}> {
            render() {
                const props = this.props;
                const classNames = ['w-full',
                    'flex-auto',
                    'min-h-[2.75rem]',
                    'bg-slate-950/35',
                    'border',
                    'border-white/10',
                    'px-3',
                    'py-2',
                    'rounded-lg',
                    'text-sm',
                    'text-slate-100',
                    'placeholder:text-slate-400',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,.04)]',
                    'outline-none',
                    'transition-shadow',
                    'ease-in-out',
                    'duration-150',
                    'focus:ring-2',
                    'focus:ring-emerald-500',
                    'focus:border-emerald-400'];

                if (type === 'input') {
                    return <input {...(props as React.InputHTMLAttributes<HTMLInputElement>)} className={[...classNames, ...(this.props.className || '').split(' ')].join(' ')} />;
                } else if (type === 'textarea') {
                    return <textarea {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} className={[...classNames, ...(this.props.className || '').split(' ')].join(' ')} />;
                } else {
                    return <select {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)} className={[...classNames, ...(this.props.className || '').split(' ')].join(' ')}>
                        {props.children}
                    </select>;
                }
            }
        };
    }
}

export const ControlInput = ControlFactory.create('input');
export const ControlTextArea = ControlFactory.create('textarea');
export const ControlSelect = ControlFactory.create('select');
