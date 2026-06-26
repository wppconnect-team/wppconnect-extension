import React, { ButtonHTMLAttributes, Component, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'glass' | 'ghost';
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
                    'border-white/10',
                    'bg-white/5',
                    'text-slate-100',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,.05)]',
                    'hover:border-white/20',
                    'hover:bg-white/10',
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
                    'bg-white/5',
                    'text-slate-300',
                    'hover:bg-white/10',
                    'hover:text-white',
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
            case 'glass':
                classNames.push(
                    'border',
                    'border-white/10',
                    'bg-white/5',
                    'text-slate-100',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_14px_30px_rgba(0,0,0,.16)]',
                    'backdrop-blur',
                    'hover:border-emerald-300/30',
                    'hover:bg-white/10',
                    'focus-visible:ring-emerald-400'
                );
                break;
            case 'ghost':
                classNames.push(
                    'bg-transparent',
                    'text-slate-300',
                    'hover:bg-white/10',
                    'hover:text-white',
                    'focus-visible:ring-slate-400'
                );
                break;
        }

        return <button {...buttonProps} className={[...classNames, ...(this.props.className || '').split(' ')].join(' ')} >
            {icon && <span className="leading-none" aria-hidden="true">{icon}</span>}
            {children}
        </button>;
    }
}
