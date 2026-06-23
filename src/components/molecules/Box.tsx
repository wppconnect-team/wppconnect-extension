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
            'bg-white',
            'dark:bg-slate-950',
            'dark:text-slate-100',
            'border',
            'border-slate-200',
            'dark:border-slate-800',
            'shadow-sm',
            'rounded-lg',
            'overflow-hidden',
            ...(this.props.className || '').split(' ')
        ].join(' ')}>
            {(title || headerButtons) && <div className={['p-4',
                'border-b',
                'border-slate-200',
                'dark:border-slate-800',
                'flex',
                'gap-3',
                'justify-between',
                'items-center',
                'bg-slate-50',
                'dark:bg-slate-900'].join(' ')}>
                {title && <h1 className={['text-lg',
                    'font-semibold',
                    'text-slate-800',
                    'dark:text-slate-200'].join(' ')}>{title}</h1>}
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
                'border-slate-200',
                'dark:border-slate-800',
                'bg-slate-50',
                'text-sm',
                'text-slate-600',
                'dark:bg-slate-900',
                'dark:text-slate-300'].join(' ')}>
                {footer}
            </div>}
        </section>;
    }
}
