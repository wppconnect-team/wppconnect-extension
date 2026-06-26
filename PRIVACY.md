# Wppconnect Extension Privacy Policy

Last updated: June 26, 2026

Wppconnect Extension is a Chrome extension that helps users operate WhatsApp Web through user-initiated actions such as preparing messages, sending messages, reviewing logs, archiving chats, and testing WA-JS capabilities.

This Privacy Policy explains what user data the extension processes, how it is used, and when it may be shared.

## Data processed by the extension

The extension may process the following data inside the user's browser:

- WhatsApp contact identifiers and phone numbers entered by the user.
- WhatsApp Web chat identifiers, chat metadata, unread counts, archive/pin/mute state, and recent message metadata when the user runs a related action.
- Message text, attachments selected by the user, message buttons, delay settings, country prefix settings, archive delay settings, and WA-JS Lab input fields.
- Local send logs, including contact, result message, attachment flag, status level, and timestamp.
- WhatsApp Web connection/profile diagnostics requested by the user, such as connection state, account display name/status, platform/build information, and whether the account is authenticated.

## How data is used

The extension uses data only to provide its user-facing features:

- Send WhatsApp Web messages requested by the user.
- Deduplicate and validate contact lists before sending.
- Store message settings and extension preferences.
- Display local progress and local logs.
- Archive, unarchive, pin, mute, mark read/unread, open chats, and run other WA-JS Lab actions requested by the user.
- Show diagnostics that help the user test WhatsApp Web and WA-JS behavior.

## Local storage

The extension stores settings and logs using `chrome.storage.local` in the user's browser. This includes message templates, attachments, buttons, delay settings, prefix settings, archive delay settings, and logs.

This data remains on the user's device unless the user clears it, removes the extension, or uses extension controls that clear logs/settings.

## Data sharing and transfers

Wppconnect Extension does not send user data to Wppconnect servers or any developer-controlled analytics service.

Data may be transferred only when necessary for the extension's single purpose and only as directed by the user:

- To WhatsApp Web/WhatsApp when the user sends a message, attachment, poll, location, vCard, or performs a WhatsApp Web action.
- To message recipients selected by the user through WhatsApp Web.
- As required by law, security, or abuse-prevention obligations.

The extension does not sell user data, does not use user data for advertising, and does not share user data with data brokers.

## Human access

The developer does not have access to the user's WhatsApp chats, contacts, message content, attachments, logs, or local settings through the extension.

Human access to user data is not performed by the extension. If a user voluntarily shares diagnostic details in a support request or public issue, that information is handled only for support and troubleshooting.

## Permissions

The extension uses Chrome permissions only to provide its core features:

- `activeTab`: communicate with the active WhatsApp Web tab when the user opens the popup or runs an action.
- `storage`: store extension settings and logs locally in the browser.
- Content scripts on `https://web.whatsapp.com/*`: integrate with WhatsApp Web and WA-JS.

## Limited Use disclosure

The extension's use and transfer of information received from Chrome APIs and WhatsApp Web is limited to providing and improving the extension's single purpose: helping the user operate WhatsApp Web from the extension. The extension does not use this data for advertising, profiling, unrelated analytics, or resale.

## Data retention and deletion

Settings and logs are stored locally in the browser. Users can clear logs from the extension options page, clear extension storage through Chrome settings, or uninstall the extension to remove local extension data.

Messages and chat changes made in WhatsApp Web are controlled by WhatsApp and the user's WhatsApp account.

## Third-party services

The extension operates on WhatsApp Web and uses WA-JS to interact with the WhatsApp Web runtime. WhatsApp and Meta process WhatsApp account and messaging data according to their own terms and privacy policies.

## Changes to this policy

This policy may be updated when the extension changes. Updates will be published in this repository and should be reflected in the Chrome Web Store listing before resubmission when required.

## Contact

For privacy questions or support, open an issue at:

https://github.com/wppconnect-team/wppconnect-extension/issues
