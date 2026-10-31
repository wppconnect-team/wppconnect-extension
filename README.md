**English** | [Português (Brasil)](./README.pt-BR.md)

<p align="center">
  <a href="https://wppconnect.io/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://wppconnect-team.github.io/brand/wppconnect-dark.png" />
      <img src="https://wppconnect-team.github.io/brand/wppconnect-light.png" alt="WPPConnect" width="220" height="121" />
    </picture>
  </a>
</p>

# Wppconnect Extension

Send configured messages and attachments through a Chrome extension for WhatsApp Web.

A project in the WPPConnect ecosystem, maintained by WPPConnect Team.

[Getting started](#getting-started) | [Documentation](#documentation) | [Contributing](#contributing) | [Support WPPConnect](#support-the-project)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE) [![Documentation](https://img.shields.io/badge/docs-WPPConnect-blue)](https://wppconnect.io/) [![Open Collective](https://img.shields.io/badge/Open%20Collective-WPPConnect-blue)](https://opencollective.com/wppconnect)

## Overview

For users who want a browser UI over WA-JS for authorized messaging. WhatsApp Web must stay open and authenticated. The extension processes WhatsApp Web data locally as described in its privacy policy.

## Features

- Configure recipient lists, message text and attachments in the options UI.
- Chrome Web Store installation or a locally built unpacked extension.
- Builds use the WA-JS release recorded in `wa-js-release.json`.

## Getting started

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/wppconnect-extension/ejamgmkhipipigkanaefjklolfddmlel), open WhatsApp Web, click the extension icon, and open **Options** to configure a message, attachment and authorized recipients. Use **Send** only after reviewing those settings.

For source development use Node.js **24** and npm:

```sh
git clone https://github.com/wppconnect-team/wppconnect-extension.git
cd wppconnect-extension
npm ci
npm run build
```

Open `chrome://extensions`, enable Developer mode, select **Load unpacked** and choose `dist`. Building downloads the pinned WA-JS release, so network access is required.

## Configuration

`WA_JS_VERSION` explicitly overrides the recorded release during a build; use `latest` only when validating an upgrade. Node types stay on major 24 and TypeScript on 6.0 with ts-loader 9; changing these requires a compatibility migration. Use the extension only for legitimate, consent-based communication; do not send spam.

## Documentation

- [Privacy policy](./PRIVACY.md)
- [Published privacy page](./docs/privacy-policy.html)
- [Pinned WA-JS release](./wa-js-release.json)
- [Retained technical details and acknowledgments](documentation/readme-reference.md)

## WPPConnect ecosystem

| Project | Purpose | When to use it |
| --- | --- | --- |
| [WPPConnect/WA-JS](https://github.com/wppconnect-team/wa-js) | Expose WhatsApp Web functions through the browser-side `WPP` API. | Run browser-side code in WhatsApp Web. |
| [WPPConnect](https://github.com/wppconnect-team/wppconnect) | Control WhatsApp Web from Node.js applications. | Embed automation in a Node.js application. |

## Support the project

WPPConnect is maintained by an open-source community. Your support helps fund maintenance, infrastructure, documentation, and the people working on the ecosystem.

If WPPConnect helps your project or business, consider making a one-time contribution or becoming a recurring supporter.

**[Support WPPConnect on Open Collective](https://opencollective.com/wppconnect)**

Contributions are voluntary. See the official page for current financial information. You can also help with code, tests, documentation, translations and well-described issue reports.

Additional official beneficiaries in [.github/FUNDING.yml](.github/FUNDING.yml): [joaosouz4dev](https://github.com/sponsors/joaosouz4dev), [manfe](https://github.com/sponsors/manfe).

## Contributing

Contributions of code, tests, examples, documentation and translations are welcome. For larger changes, discuss the approach in an issue first. Include the project/runtime versions, a minimal reproduction and sanitized logs when reporting a problem. Update both `README.md` and `README.pt-BR.md` in the same change when installation, configuration, features, examples, licensing or funding changes.

Read [CONTRIBUTING.md](CONTRIBUTING.md).

Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

After installing the development dependencies, use the repository checks relevant to your change:

```sh
npm run typecheck
npm run test:unit
npm run build
```

Account-dependent examples and tests require separate validation with an authorized test account. Never attach credentials or session files to an issue.

## Community and support

Use [repository issues](https://github.com/wppconnect-team/wppconnect-extension/issues) for reproducible bugs and feature proposals. For usage questions, join the community through the official channels:

- [Discord](https://discord.gg/JU5JGGKGNG)
- [Telegram](https://t.me/wppconnect)
- [YouTube](https://www.youtube.com/c/wppconnect)

This project is independent and is not affiliated with or endorsed by WhatsApp or Meta. Follow applicable terms and obtain authorization for account and messaging operations.

## License

[MIT License (MIT)](./LICENSE).

Copyright (c) 2023 Marcos V. Rubido.

The original legal document and existing copyright notices are preserved. Third-party components retain their own terms.
