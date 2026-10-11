# Stage Flow Tools

Real-time quiz and interaction tool for live presentations. Features include admin-controlled quiz flow, live results, and instant audience participation. Boost engagement on stage - at conferences, sessions, and workshops.

## What It Does

This application enables presenters to interact with their audience through live quizzes, emojis, etc.<br>
Perfect for:

- Conference presentations
- Educational sessions
- Team meetings
- Interactive workshops

### Key Features

- **Live Interaction**: Audience members join and answer questions in real-time
- **Admin Control**: Presenters manage questions and control the quiz flow
- **Real-time Results**: Live visualization of voting patterns
- **No Registration**: Participants join instantly with just a nickname
- **Sharp Design, No Rounded Corners**: Sharp, geometric black and white interface

## Application Routes

- **`/`** - [Participant quiz interface](docs/features/participation.md)
- **`/login`** - [Admin login](docs/features/admin-access.md)
- **`/admin`** - [Admin overview with links to sub-pages](docs/features/admin-access.md)
- **`/admin/questions`** - [Question management and packages](docs/features/questions.md)
- **`/admin/presenter`** - [Quiz sequence, question selection, and live status](docs/features/presenter.md)
- **`/admin/results`** - [Live results and quiz controls](docs/features/results.md)
- **`/admin/leaderboard`** - [Player leaderboard and winner draw](docs/features/leaderboard.md)
- **`/admin/recap`** - [Post-quiz statistics and highlights](docs/features/recap.md)
- **`/admin/emojis`** - [Floating emoji overlay](docs/features/emojis.md)
- **`/admin/database`** - [Embedded Drizzle Studio for database inspection](docs/features/database-admin.md)
- **`/legal-notice`** - [Legal notice (Impressum)](docs/features/legal-documents.md)
- **`/privacy-policy`** - [Privacy policy (Datenschutzerklärung)](docs/features/legal-documents.md)

## Documentation

For detailed information, see the [`/docs`](docs/) folder:

- [Feature Guide](docs/features/README.md) - Capabilities, controls, parameters, and examples for every product area
- [Quick Start Guide](docs/quick-start.md)
- [Local Development Setup](docs/setup-local.md)
- [Production Deployment](docs/setup-production.md)
- [Deployment-Specific Legal Documents](docs/legal-texts.md)
- [Display URL Parameters](docs/url-parameters.md)
- etc.

## Contribution & Attribution

### Project Contributors

<a href="https://github.com/toddeTV/stage-flow-tools/graphs/contributors">
<img src="https://contrib.rocks/image?repo=toddeTV/stage-flow-tools" alt="Contributors to toddeTV/stage-flow-tools" />
</a>

### Current Core Team Members

- [Thorsten Seyschab](https://todde.tv) as Project Founder & Lead.
  - [GitHub](https://github.com/toddeTV/)
  - [X (Twitter)](https://x.com/toddeTV)
  - [Bluesky](https://bsky.app/profile/todde.tv)
  - [LinkedIn](https://www.linkedin.com/in/toddetv/)

### Acknowledgments

**Special Thanks:**<br>
_(People who provided valuable help on specific topics or issues)_

- \[currently none\]

**Helpful Projects:**<br>
_(Projects that provided valuable inspiration or resources.)_

- \[currently none\]

**Additional Tools:**<br>
_(excluding those listed in `./package.json`)_

- [OpenAI Codex](https://developers.openai.com/codex/) was used as an AI coding assistant for code reviews and iterative development, helping improve code quality and maintain best practices.

**Assets & Materials Used:**<br>
_(including images & 3D models; mostly only those requiring attribution)_

- \[currently none\]

## License

Copyright (c) 2025-present Thorsten Seyschab ([https://todde.tv/](https://todde.tv)).

Licensed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0). See [LICENSE](/LICENSE) and [NOTICE](/NOTICE).

### Third-Party Libraries

This project utilizes third-party libraries and other materials. These components are the property of their respective owners and are licensed under their own terms. Direct package dependency notices are generated in [THIRD_PARTY_NOTICES.md](/THIRD_PARTY_NOTICES.md); additional human acknowledgments remain in the [_Contribution & Attribution_](#contribution--attribution) section above.
