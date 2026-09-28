<p align="center">
  <img src="public/logo.png" alt="logo" /><br/>
  <strong>Ship, Change, Rawr</strong>
</p>


[![Version](https://img.shields.io/badge/version-1.0.7-blue.svg)](https://github.com/supernova3339/changerawr)
[![Status](https://img.shields.io/badge/status-Production%20Ready-green.svg)](https://github.com/supernova3339/changerawr)
[![License](https://img.shields.io/badge/license-CNC%20OSL-purple.svg)](LICENSE)
[![AI-DECLARATION: assist](https://img.shields.io/badge/%E4%B7%BC%20AI--DECLARATION-assist-fef9c3?labelColor=fef9c3)](AI-DECLARATION.md)

# What is Changerawr?

Changerawr lets you write down what you changed, then share those changes with people. You write entries about updates you made, and Changerawr gives you ways to display them - like widgets for your website, public pages people can visit, or APIs to use however you want. \
You can think of it as a **Changelog Management System** [CMS]

If you don't know what a changelog is, check out [betterauth](https://www.better-auth.com/changelog) for an example!

## ✨ Why Changerawr?

**Developer-focused.** Headless API, beautiful documentation, SDKs, integrations, and a CLI.

**Fully customizable.** Do things your way. No vendor lock-in, no forced workflows.

**For everyone.** Whether you're a solo developer, small business, or enterprise team - Changerawr scales with you. ( yes, this means you can use it for commercial usage! just please do reach out if you do, I would love to know how your using Changerawr! )

## 🚀 A few of Changerawr's many features 👇

- **📝 Beautiful Content Editor** - Write professional changelogs that look polished, with the tooling to make them perfect
- **🕰️ Full Revision History** - Git-like experience flexible enough to satisfy authors and administrators alike
- **🤖 AI-Powered** - Let AI help you write better changelog entries and more
- **📡 Headless API**: Fully documented REST API mirrors core functionality, enabling complete application control without extra setup
- **🧩 SDKs** - Pre-built libraries for popular languages
- **🎨 Embeddable Widgets** - Drop a changelog widget anywhere on your site in four different flavors
- **📧 Email Notifications** - Keep users informed of updates
- **🏷️ Tags & Versioning** - Organize entries exactly how you want and color tags to match the mood
- **🔗 Multiple Integrations** - Connect with your existing tools, e.g., Slack
- **🔐 Modern Authentication** - Custom-built authentication with passkey, OAuth2, and SAML support out of the box
- **🖥️ Desktop-First Design** - Built for desktop use (mobile works, but it's quirky)
- **🔍 Full-Text Search** - Search everything, instantly
- **🔌 Fully Extendable** - Add your own [Changerawr Universal Markdown](https://github.com/changerawr/markdown) extensions to the content editor, and share them with everyone!*
- **🌐 Custom Domains** - Link a custom domain to your changelog ( you can give it an SSL certificate, too!** )

<sup><sub>* Sharing extensions is really easy! Just follow our [example repository](https://github.com/changerawr/extension-store) to get started! If you have any questions, send us an e-mail! We're more than happy to help you!</sub></sup> \
<sup><sub>** SSL Certificates require having the [nginx-sidecar](https://github.com/Changerawr/nginx-agent) setup and configured correctly. - We reccomend following our [setup guide](https://github.com/Changerawr/nginx-agent/blob/master/chragent.conf.example) for the best possible results.</sub></sup>

## 📸 A peek inside

<!-- GALLERY:START -->
<table align="center">
  <tr>
    <td width="25%"><img src="screenshots/gallery/screenshots_dashboard.png" width="100%" alt="Dashboard overview" /></td>
    <td width="25%"><img src="screenshots/gallery/screenshots_dashboard_projects.png" width="100%" alt="Projects list" /></td>
    <td width="25%"><img src="screenshots/gallery/screenshots_dashboard_projects_projectId_changelog.png" width="100%" alt="Changelog view" /></td>
    <td width="25%"><img src="screenshots/gallery/screenshots_dashboard_projects_projectId_changelog_new.png" width="100%" alt="New changelog entry editor" /></td>
  </tr>
  <tr>
    <td width="25%"><img src="screenshots/gallery/screenshots_dashboard_admin_users.png" width="100%" alt="Admin user management" /></td>
    <td width="25%"><img src="screenshots/gallery/screenshots_dashboard_admin_audit-logs.png" width="100%" alt="Admin audit logs" /></td>
    <td width="25%"><img src="screenshots/gallery/screenshots_dashboard_admin_ai-settings.png" width="100%" alt="AI settings" /></td>
    <td width="25%"><img src="screenshots/gallery/screenshots_dashboard_projects_projectId_settings_tags.png" width="100%" alt="Tag management" /></td>
  </tr>
</table>
<!-- GALLERY:END -->

## 🚀 Quick Start

### Prerequisites

- Node.js 24+
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/supernova3339/changerawr.git
cd changerawr

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your settings

# Set up database
npx prisma generate
npx prisma migrate deploy

# Build the widget
npm run build:widget

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and you're ready to go!

### Docker Setup

```bash
docker-compose up --build
```

## ⚙️ Configuration

### Environment Variables*

```bash
# Database
DATABASE_URL="postgresql://postgres@localhost:5432/changerawr?schema=public"

# Authentication
JWT_ACCESS_SECRET="your-jwt-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# GitHub Integration (optional)
GITHUB_ENCRYPTION_KEY="your-github-encryption-key"

# Analytics
ANALYTICS_SALT="your-secure-random-salt-here"
```
<sup><sub>This is not a full list, refer to the .env.example for a full list.</sub></sup>

## 🛠️ Tech Stack

**Built with modern, reliable technologies:**

- **Next.js 16** - React framework with App Router
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Robust, scalable database
- **Shadcn/UI** - Beautiful, accessible UI components
- **TypeScript** - Full type safety throughout
- **Changerawr Universal Markdown** - Our in-house content engine

## 🏗️ Development

### Available Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Start built development serer
npm run start:prod       # Start production server
npm run start:prod:win   # Start production server ( Windows )
npm run build:widget     # Build embeddable widget
npm run generate-swagger # Generate API docs
npm run lint             # Code linting ( next 16 will depc this - note )
npm run maintenance      # Run the maintenance page
npm run start:with-maintenance # Runs maintenance page and the main server
npm run prisma:studio # Database viewer and manager 

```

### Project Structure

```
changerawr/
├── app/                 # Next.js App Router
│   ├── (auth)/         # Auth pages
│   ├── (email)/        # Newsletter related pages
│   ├── api/            # API endpoints
│   ├── api-docs/       # API Documentation
|   ├── changelog/      # Changelog pages (public/custom-domain)
│   ├── cli/            # Internal pages used to interface with the Changerawr CLI
│   └── dashboard/      # Main app
├── components/         # React components
├── lib/               # Core utilities
├── prisma/            # Database schema
├── widgets/           # Widget source
├── scripts/           # Build scripts
└── emails/            # Email templates
```

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build
docker build -t changerawr .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e JWT_ACCESS_SECRET="your-secret" \
  -e NEXT_PUBLIC_APP_URL="your-app-url" \
  -e GITHUB_ENCRYPTION_KEY="your-encryption-key-32-chars" \
  -e ANALYTICS_SALT="your-analytics-salt" \
  changerawr
```

#### Optional: AI changelog tagger

`docker-compose.yml` / `docker-compose-online.yml` already run this alongside the app automatically — nothing to configure. If you're deploying from the bare `Dockerfile` (no compose), start it yourself as a sibling container on a shared network and point Changerawr at it:

```bash
# Shared network so the containers can reach each other by name
docker network create changerawr-net

# Start the tagger (own image — separate from the app, ~1GB of model weights)
docker run -d --name changerawr-tagger --network changerawr-net \
  --memory=4g --memory-swap=4g \
  -e PORT=31672 \
  -v tagger_models:/app/models -v tagger_data:/app/runtime \
  ghcr.io/changerawr/tag-ai:latest

# Point the app at it (add to the `docker run` above, plus --network changerawr-net)
-e CHANGELOG_TAGGER_URL="http://changerawr-tagger:31672"
```

Changerawr auto-detects it via that URL — no admin UI setup needed. If it's unreachable, tag suggestions are just silently unavailable; nothing else is affected. See [Changerawr/tag-ai](https://github.com/Changerawr/tag-ai) for details.

### Manual Deployment

```bash
npm run build
npx prisma migrate deploy
npm run build:widget
npm run generate-swagger
npm start:with-maintenance
```

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 Bug fixes
- ✨ New features
- 📖 Documentation improvements
- 🎨 UI/UX enhancements

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

Non-Commercial Open Source License - see [LICENSE](LICENSE) for details.

Changerawr is open source and free to use, modify, and fork (including closed-source versions). You can use it commercially in your business, but you cannot profit from selling the software itself or charge users for access to it. All features remain free forever.

## 🙋‍♂️ Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/supernova3339/changerawr/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/supernova3339/changerawr/discussions)

---

**Built by developers, for developers.**
