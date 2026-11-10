# packages

Code that more than one app uses. Writing a rule once here means the mobile app,
the websites and the server can never disagree about it. The folders do not
exist yet. Each one is created in the milestone that first needs it.

| Folder          | What it will hold                                                      |
| --------------- | ---------------------------------------------------------------------- |
| `shared-types`  | The shapes of the data that the apps and the API exchange              |
| `validation`    | Rules for checking input, such as the format of a phone number         |
| `configuration` | Shared settings for tools such as TypeScript and the linter            |
| `localization`  | The texts of the product in Kurdish Sorani, Arabic and English         |
| `ui`            | Building blocks shared by the provider website and the admin website   |

A package never imports code from `apps/`.
