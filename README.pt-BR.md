[English](./README.md) | **Português (Brasil)**

<p align="center">
  <a href="https://wppconnect.io/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://wppconnect-team.github.io/brand/wppconnect-dark.png" />
      <img src="https://wppconnect-team.github.io/brand/wppconnect-light.png" alt="WPPConnect" width="220" height="121" />
    </picture>
  </a>
</p>

# Wppconnect Extension

Envie mensagens e anexos configurados por uma extensão Chrome para WhatsApp Web.

Um projeto do ecossistema WPPConnect, mantido pela WPPConnect Team.

[Primeiros passos](#primeiros-passos) | [Documentação](#documentação) | [Como contribuir](#como-contribuir) | [Apoie a WPPConnect](#apoie-o-projeto)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE) [![Documentation](https://img.shields.io/badge/docs-WPPConnect-blue)](https://wppconnect.io/) [![Open Collective](https://img.shields.io/badge/Open%20Collective-WPPConnect-blue)](https://opencollective.com/wppconnect)

## Visão geral

Para usuários que precisam de uma interface de navegador sobre WA-JS para mensagens autorizadas. O WhatsApp Web deve permanecer aberto e autenticado. A extensão processa dados do WhatsApp Web localmente, conforme sua política de privacidade.

## Funcionalidades

- Configure listas de destinatários, texto e anexos na interface de opções.
- Instalação pela Chrome Web Store ou extensão descompactada compilada localmente.
- Os builds usam a versão WA-JS registrada em `wa-js-release.json`.

## Primeiros passos

Instale pela [Chrome Web Store](https://chromewebstore.google.com/detail/wppconnect-extension/ejamgmkhipipigkanaefjklolfddmlel), abra o WhatsApp Web, clique no ícone da extensão e abra **Options** para configurar mensagem, anexo e destinatários autorizados. Use **Send** apenas após revisar essas opções.

Para desenvolver pelos fontes use Node.js **24** e npm:

```sh
git clone https://github.com/wppconnect-team/wppconnect-extension.git
cd wppconnect-extension
npm ci
npm run build
```

Abra `chrome://extensions`, ative o modo de desenvolvedor, selecione **Carregar sem compactação** e escolha `dist`. O build baixa a versão WA-JS fixada e exige acesso à rede.

## Configuração

`WA_JS_VERSION` substitui explicitamente a versão registrada durante o build; use `latest` apenas ao validar uma atualização. Os tipos Node permanecem na major 24 e o TypeScript em 6.0 com ts-loader 9; alterações exigem uma migração de compatibilidade. Use a extensão apenas para comunicação legítima e consentida; não envie spam.

## Documentação

- [Política de privacidade](./PRIVACY.md)
- [Página publicada de privacidade](./docs/privacy-policy.html)
- [Versão WA-JS fixada](./wa-js-release.json)
- [Detalhes técnicos e agradecimentos preservados](documentation/readme-reference.md)

## Ecossistema WPPConnect

| Projeto | Finalidade | Quando usar |
| --- | --- | --- |
| [WPPConnect/WA-JS](https://github.com/wppconnect-team/wa-js) | Exponha funções do WhatsApp Web pela API `WPP` no navegador. | Executar código no navegador dentro do WhatsApp Web. |
| [WPPConnect](https://github.com/wppconnect-team/wppconnect) | Controle o WhatsApp Web em aplicações Node.js. | Incorporar automação a uma aplicação Node.js. |

## Apoie o projeto

A WPPConnect é mantida por uma comunidade de código aberto. Seu apoio ajuda a financiar a manutenção, a infraestrutura, a documentação e o trabalho das pessoas que desenvolvem o ecossistema.

Se a WPPConnect ajuda seu projeto ou sua empresa, considere fazer uma contribuição pontual ou apoiar de forma recorrente.

**[Apoie a WPPConnect no Open Collective](https://opencollective.com/wppconnect)**

As contribuições são voluntárias. Consulte a página oficial para acompanhar as informações financeiras atuais. Você também pode ajudar com código, testes, documentação, traduções e relatos de problemas bem descritos.

Beneficiários oficiais adicionais em [.github/FUNDING.yml](.github/FUNDING.yml): [joaosouz4dev](https://github.com/sponsors/joaosouz4dev), [manfe](https://github.com/sponsors/manfe).

## Como contribuir

Contribuições de código, testes, exemplos, documentação e traduções são bem-vindas. Para mudanças maiores, discuta a proposta em uma issue primeiro. Ao relatar um problema, informe as versões do projeto/runtime, uma reprodução mínima e logs sem dados sensíveis. Atualize `README.md` e `README.pt-BR.md` na mesma alteração quando mudar instalação, configuração, funcionalidades, exemplos, licença ou arrecadação.

Leia [CONTRIBUTING.md](CONTRIBUTING.md).

Leia [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Após instalar as dependências de desenvolvimento, use as verificações pertinentes à sua alteração:

```sh
npm run typecheck
npm run test:unit
npm run build
```

Exemplos e testes que dependem de conta exigem validação separada com uma conta de teste autorizada. Nunca anexe credenciais ou arquivos de sessão a uma issue.

## Comunidade e suporte

Use as [issues do repositório](https://github.com/wppconnect-team/wppconnect-extension/issues) para bugs reproduzíveis e propostas de funcionalidades. Para dúvidas de uso, participe pelos canais oficiais:

- [Discord](https://discord.gg/JU5JGGKGNG)
- [Telegram](https://t.me/wppconnect)
- [YouTube](https://www.youtube.com/c/wppconnect)

Este projeto é independente e não é afiliado nem endossado pelo WhatsApp ou pela Meta. Siga os termos aplicáveis e obtenha autorização para operações de conta e mensagens.

## Licença

[MIT License (MIT)](./LICENSE).

Copyright (c) 2023 Marcos V. Rubido.

O documento jurídico original e os avisos de autoria existentes são preservados. Componentes de terceiros mantêm seus próprios termos.
