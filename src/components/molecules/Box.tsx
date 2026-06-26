import React, { Component, HTMLAttributes, ReactNode } from 'react';

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
    title?: string;
    headerButtons?: ReactNode;
    bodyClassName?: string;
    footer?: ReactNode;
}

export default class Box extends Component<BoxProps, {}> {
    render() {
        const { children, title, headerButtons, bodyClassName, footer, ...boxProps } = this.props;
        return <section {...boxProps} className={['w-full',
            'max-w-3xl',
            'mx-auto',
            'flex',
            'flex-col',
            'bg-slate-900/56',
            'text-slate-100',
            'border',
            'border-white/10',
            'shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_18px_60px_rgba(0,0,0,.18)]',
            'backdrop-blur',
            'rounded-2xl',
            'overflow-hidden',
            ...(this.props.className || '').split(' ')
        ].join(' ')}>
            {(title || headerButtons) && <div className={['p-4',
                'border-b',
                'border-white/10',
                'flex',
                'gap-3',
                'justify-between',
                'items-center',
                'bg-white/5'].join(' ')}>
                {title && <h1 className={['text-lg',
                    'font-semibold',
                    'text-white'].join(' ')}>{title}</h1>}
                {headerButtons}
            </div>}
            <div className={[
                'flex-auto',
                'flex',
                'flex-col',
                'gap-4',
                'p-4',
                ...(this.props.bodyClassName || '').split(' ')
            ].join(' ')}>
                {children}
            </div>
            {footer && <div className={['px-4',
                'py-3',
                'border-t',
                'border-white/10',
                'bg-white/5',
                'text-sm',
                'text-slate-400'].join(' ')}>
                {footer}
            </div>}
        </section>;
    }
}
