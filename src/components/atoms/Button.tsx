import React, { ButtonHTMLAttributes, Component, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    icon?: ReactNode;
}

export default class Button extends Component<ButtonProps, {}> {
    render() {
        const { variant = 'secondary', icon, children, ...buttonProps } = this.props;

        const classNames = [
            'inline-flex',
            'items-center',
            'justify-center',
            'gap-2',
            'min-h-[2.5rem]',
            'px-4',
            'py-2',
            'rounded-lg',
            'text-sm',
            'font-semibold',
            'transition',
            'ease-in-out',
            'duration-150',
            'disabled:cursor-not-allowed',
            'disabled:opacity-50',
            'focus:outline-none',
            'ring-2',
            'ring-transparent',
            'focus-visible:ring-offset-2',
            'focus-visible:ring-offset-white',
            'dark:focus-visible:ring-offset-slate-950'
        ];
        switch (variant) {
            case 'primary':
                classNames.push(
                    'bg-emerald-600',
                    'text-white',
                    'shadow-sm',
                    'hover:bg-emerald-700',
                    'focus-visible:ring-emerald-500'
                );
                break;
            case 'secondary':
                classNames.push(
                    'border',
                    'border-slate-300',
                    'bg-white',
                    'text-slate-700',
                    'shadow-sm',
                    'hover:border-slate-400',
                    'hover:bg-slate-50',
                    'dark:border-slate-700',
                    'dark:bg-slate-900',
                    'dark:text-slate-100',
                    'dark:hover:border-slate-600',
                    'dark:hover:bg-slate-800',
                    'focus-visible:ring-slate-400'
                );
                break;
            case 'success':
                classNames.push(
                    'bg-emerald-600',
                    'text-white',
                    'hover:bg-emerald-700',
                    'focus-visible:ring-emerald-500'
                );
                break;
            case 'danger':
                classNames.push(
                    'bg-rose-600',
                    'text-white',
                    'hover:bg-rose-700',
                    'focus-visible:ring-rose-500'
                );
                break;
            case 'warning':
                classNames.push(
                    'bg-amber-500',
                    'text-slate-950',
                    'hover:bg-amber-400',
                    'focus-visible:ring-amber-400'
                );
                break;
            case 'info':
                classNames.push(
                    'bg-cyan-600',
                    'text-white',
                    'hover:bg-cyan-700',
                    'focus-visible:ring-cyan-500'
                );
                break;
            case 'light':
                classNames.push(
                    'bg-slate-100',
                    'text-slate-700',
                    'hover:bg-slate-200',
                    'dark:bg-slate-800',
                    'dark:text-slate-100',
                    'dark:hover:bg-slate-700',
                    'focus-visible:ring-slate-400'
                );
                break;
            case 'dark':
                classNames.push(
                    'bg-slate-950',
                    'text-white',
                    'hover:bg-slate-800',
                    'dark:bg-white',
                    'dark:text-slate-950',
                    'dark:hover:bg-slate-200',
                    'focus-visible:ring-slate-500'
                );
                break;
        }

        return <button {...buttonProps} className={[...classNames, ...(this.props.className || '').split(' ')].join(' ')} >
            {icon && <span className="leading-none" aria-hidden="true">{icon}</span>}
            {children}
        </button>;
    }
}
