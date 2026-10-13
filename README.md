# 🌙 Moon - BIBFRAME Cataloging Platform

> **Version:** MOON TO 16  
> **Status:** ✅ Production Ready  
> **Type:** Enterprise Bibliographic Cataloging System

---

## 🎯 What is Moon?

Moon is a comprehensive, next-generation web-based cataloging platform implementing the BIBFRAME 2.0/3.0 data model. Inspired by Library of Congress Marva, Sinopia (LD4P), JCricket, and FOLIO, Moon provides professional catalogers with powerful tools for creating, managing, and sharing bibliographic records.

### Key Highlights

✨ **Ontology-Driven Architecture** - Fields generated dynamically from BIBFRAME ontology  
✨ **Real Examples Included** - Load complete, real-world records instantly  
✨ **Bilingual Support** - Full Arabic and English with RTL support  
✨ **Apple-Inspired Design** - Beautiful, modern UI with multiple themes  
✨ **Linked Data Ready** - Export as JSON-LD, RDF/Turtle, SPARQL-compatible  
✨ **FOLIO Integration** - 377+ modules, bidirectional sync  
✨ **Multi-Institutional** - JCricket collaborative cataloging  
✨ **100% MARC Coverage** - Complete MARC21 field mapping  

---

## 🚀 Quick Start

### 1. Login
Open the application and login with your credentials.

### 2. Access Moon Engine
From the dashboard, click the **"Moon Engine"** card (look for the ✨ Sparkles icon).

### 3. Load a Real Example
Click the green **"Load Real Example"** button in the header and choose:
- **One Hundred Years of Solitude** (English fiction)
- **الأيام - طه حسين** (Arabic autobiography)
- **Introduction to Algorithms** (Academic textbook)

### 4. Explore
- **Work Tab:** Intellectual content (title, author, subjects)
- **Instance Tab:** Physical details (publisher, ISBN, pages)
- **Preview Tab:** See JSON-LD, Turtle, MARC, OPAC, Mind Map

### 5. Save & Export
- Click **"Save Record"** to store in database
- Click **"JSON-LD"** or **"Turtle"** to download

**📖 Detailed Guide:** [MOON_ENGINE_QUICK_START.md](./MOON_ENGINE_QUICK_START.md)

---

## 📚 Documentation

| Document | Description | Size |
|----------|-------------|------|
| **[README.md](./README.md)** (this file) | Project overview and navigation | ~8 pages |
| **[MOON TO 16 Summary](./MOON_TO_16_SUMMARY.md)** | Executive summary and highlights | ~15 pages |
| **[MOON TO 16 Project Report](./MOON_TO_16_PROJECT_REPORT.md)** | Comprehensive documentation | ~50 pages |
| **[Moon Engine Quick Start](./MOON_ENGINE_QUICK_START.md)** | Step-by-step tutorial | ~15 pages |
| **[Visual Guide](./LOAD_REAL_EXAMPLE_VISUAL_GUIDE.md)** | Visual walkthrough with diagrams | ~10 pages |
| **[Documentation Index](./DOCUMENTATION_INDEX.md)** | Navigation guide | ~10 pages |
| **[Table of Contents](./TABLE_OF_CONTENTS.md)** | Complete ToC | ~12 pages |

**Total:** 7 documents, ~85 pages, 20,000+ words

**👉 Not sure where to start?** 
- **New users:** [Quick Start Guide](./MOON_ENGINE_QUICK_START.md)
- **Administrators:** [Summary](./MOON_TO_16_SUMMARY.md) → [Project Report](./MOON_TO_16_PROJECT_REPORT.md)
- **Need help navigating:** [Documentation Index](./DOCUMENTATION_INDEX.md)

---

## 🎨 Features

### Core Cataloging
- **10+ Templates:** Moon Engine, KAMI, Marva Quartz, Comprehensive Monograph, etc.
- **Three-Pane Layout:** Work, Instance, Preview
- **Dynamic Fields:** Auto-generated from BIBFRAME ontology
- **Real-Time Preview:** JSON-LD, Turtle, XML, MARC, OPAC, Mind Map

### Data & Standards
- **BIBFRAME 2.0/3.0:** Full implementation
- **MARC21:** 377+ fields mapped
- **RDA:** Resource Description and Access support
- **Linked Data:** Proper URIs and RDF graphs
- **Authority Control:** LOC, Wikidata integration

### Collaboration
- **JCricket:** Multi-institutional provenance
- **Review Workflow:** Approval processes
- **Event Logging:** Complete audit trail
- **Template Sharing:** Resource Template Manager

### Integration
- **FOLIO:** 377+ modules, bidirectional sync
- **LOC APIs:** Authority files, subject headings
- **Wikidata:** Entity enrichment
- **Export:** JSON-LD, Turtle, MARC, XML

### User Experience
- **Bilingual:** Arabic & English, RTL support
- **Themes:** Default, Apple Store, Dark Mode
- **Responsive:** Works on desktop and tablets
- **Accessible:** WCAG compliant

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│   Frontend (React + TypeScript) │
│   • Moon Engine                 │
│   • 10+ Cataloging Templates    │
│   • Theme System                │
└─────────────────────────────────┘
              ↕
┌─────────────────────────────────┐
│   Server (Supabase Edge Funcs)  │
│   • Hono Web Framework          │
│   • KV Store                    │
│   • Authentication              │
└─────────────────────────────────┘
              ↕
┌─────────────────────────────────┐
│   Database (PostgreSQL)         │
│   • Bibliographic Records       │
│   • User Accounts               │
│   • Provenance Data             │
└─────────────────────────────────┘
```

---

## 📊 Statistics

- **Components:** 75+
- **Lines of Code:** 35,000+
- **Cataloging Templates:** 10+
- **MARC Fields:** 377+
- **BIBFRAME Properties:** 150+
- **Themes:** 3 (Default, Apple Store, + Dark)
- **Languages:** 2 (English, Arabic)
- **Real Examples:** 3 complete records

---

## 🎯 Use Cases

### Academic Libraries
Catalog monographs, serials, dissertations with authority control and MARC export.

### National Libraries
Large-scale cataloging with multi-institutional collaboration and preservation metadata.

### Special Collections
Rare books, manuscripts, unique materials with complex descriptions and provenance.

### Consortium Cataloging
Shared cataloging across institutions with merge/split workflows and authority sharing.

---

## 🌟 What's New in MOON TO 16

### ✨ Moon Engine Enhancements
- **Load Real Example Button** - Instant access to 3 complete, real-world BIBFRAME records
- **Toast Notifications** - Beautiful success/error messages
- **Improved UX** - Dropdown menu for example selection
- **Real Authority URIs** - Examples include actual LOC authority links

### 📖 Real Examples
1. **One Hundred Years of Solitude** by Gabriel García Márquez
   - English fiction, magic realism
   - Complete LOC authorities and classifications
   
2. **الأيام (Al-Ayyam)** by طه حسين (Taha Hussein)
   - Arabic autobiography
   - Full RTL support, Arabic subjects
   
3. **Introduction to Algorithms** by Cormen et al.
   - Academic textbook
   - Multiple authors, edition statements

### 📄 Documentation
- **MOON TO 16 Project Report** - 50+ page comprehensive guide
- **Moon Engine Quick Start** - Step-by-step tutorial
- **Updated README** - This file!

---

## 🛠️ Technology Stack

### Frontend
- React 18.x
- TypeScript 5.x
- Tailwind CSS v4.0
- shadcn/ui components
- lucide-react icons
- react-i18next (i18n)

### Backend
- Deno runtime
- Hono web framework
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage

### Standards
- BIBFRAME 2.0/3.0
- MARC21
- RDA
- RDF
- JSON-LD
- SPARQL

---

## 🎨 Themes

### Default Theme
Clean, modern interface with professional styling.

### Apple Store Theme
Official Apple.com aesthetic with:
- Hero sections and gradients
- Signature Apple blue (#0071e3)
- Minimalist design
- Glass morphism effects

### Dark Mode
All themes support dark mode with proper contrast.

**Switch themes:** Click the theme selector in the top navigation bar.

---

## 🌐 Bilingual Support

### English
- Complete UI translation
- LTR (Left-to-Right) layout
- Western cataloging conventions

### Arabic (العربية)
- Complete UI translation
- RTL (Right-to-Left) layout
- Arabic script support
- Bilingual subject headings
- Arabic cataloging standards

**Switch languages:** Click the globe icon (🌐) in the top bar.

---

## 🔐 Security

- ✅ Supabase Authentication
- ✅ Row-level security
- ✅ HTTPS/TLS encryption
- ✅ Environment variables for secrets
- ✅ Role-based access control
- ✅ Session management

---

## 📞 Support

### Documentation
- [Project Report](./MOON_TO_16_PROJECT_REPORT.md) - Complete system documentation
- [Quick Start](./MOON_ENGINE_QUICK_START.md) - Getting started guide
- Inline code documentation - JSDoc comments in source

### External Resources
- [BIBFRAME Specification](https://www.loc.gov/bibframe/)
- [MARC21 Documentation](https://www.loc.gov/marc/)
- [Library of Congress Authorities](https://id.loc.gov/)
- [Supabase Documentation](https://supabase.com/docs)

---

## 🎓 Learning Path

### For Beginners
1. Read the [Quick Start Guide](./MOON_ENGINE_QUICK_START.md)
2. Login and access Moon Engine
3. Load "One Hundred Years of Solitude" example
4. Explore Work, Instance, and Preview tabs
5. Try editing fields and previewing changes

### For Experienced Catalogers
1. Review the [Project Report](./MOON_TO_16_PROJECT_REPORT.md)
2. Explore multiple templates (KAMI, Marva, Comprehensive)
3. Test FOLIO integration
4. Set up JCricket provenance
5. Create custom Resource Templates

### For Developers
1. Study the ontology engine code
2. Review graph builder implementation
3. Explore theme system architecture
4. Check API integration patterns
5. Understand component structure

---

## 🔮 Roadmap

### Planned Features
- Machine learning for auto-classification
- Real-time collaborative editing
- Mobile apps (iOS/Android)
- Additional export formats (MODS, Dublin Core)
- Enhanced search with facets
- BIBFRAME 4.0 support (when released)

---

## 🙏 Acknowledgments

### Inspired By
- **Library of Congress Marva** - Ontology-driven approach
- **Sinopia (LD4P)** - Linked data workflows
- **JCricket** - Multi-institutional collaboration
- **FOLIO** - Modern library platform
- **Apple** - Design excellence

### Standards Organizations
- Library of Congress
- MARC Standards Office
- RDA Steering Committee
- W3C (RDF/Linked Data)

---

## 📝 Version

**Current Version:** MOON TO 16  
**Release Date:** February 15, 2026  
**Status:** Production Ready ✅  

---

## 🌙 About the Name

**Moon** represents:
- **Illumination** - Shining light on complex bibliographic data
- **Guidance** - Helping catalogers navigate the BIBFRAME universe
- **Reliability** - Consistent, like the moon's phases
- **Universality** - Visible from everywhere, like our bilingual support

---

## 🎉 Get Started Now!

1. **Login** to the Moon application
2. **Click** on "Moon Engine" from the dashboard
3. **Load** a real example to see it in action
4. **Start** cataloging with confidence!

### Need Help?
- 📖 [Read the Quick Start Guide](./MOON_ENGINE_QUICK_START.md)
- 📄 [Check the Project Report](./MOON_TO_16_PROJECT_REPORT.md)
- 💡 Load a real example and explore!

---

## 📜 License

This is a proprietary application developed for bibliographic cataloging purposes.

---

## 🌟 Key Message

> "Moon brings the power of BIBFRAME, linked data, and modern cataloging to libraries worldwide. From small special collections to large consortia, Moon illuminates the path to professional, standards-compliant bibliographic description."

---

**Built with ❤️ for librarians, catalogers, and information professionals everywhere.**

🌙 **Moon - Illuminating the Future of Bibliographic Cataloging**

---

**Last Updated:** February 15, 2026  
**Version:** MOON TO 16  
**Platform:** Figma Make + Supabase
