# apps

Programs that we run or publish. Each one gets its own folder with its own
`package.json`. The folders do not exist yet. They arrive in later milestones.

| Folder         | What it will be                                              | Planned milestone |
| -------------- | ------------------------------------------------------------ | ----------------- |
| `api`          | The server (NestJS). Every business rule lives here          | 1.4               |
| `mobile`       | The customer app for iOS and Android (Expo and React Native) | 1.6               |
| `provider-web` | The website that stations and mobile washers use (Next.js)   | 1.7               |
| `admin-web`    | The website that our own staff use (Next.js)                 | 1.7               |

Two rules:

1. An app may use code from `packages/`.
2. An app never imports code from another app. If two apps need the same code,
   that code moves into `packages/`.
