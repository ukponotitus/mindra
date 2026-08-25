# ContentRepurpose — AI Content Repurposing Platform (SaaS Dashboard UI)

Design a modern, premium SaaS web application called **ContentRepurpose**.

The product helps creators upload a long-form video, audio, podcast, webinar, or YouTube link and automatically transform it into platform-specific content for Facebook, LinkedIn, Instagram, X (Twitter), TikTok, YouTube Shorts, newsletters, blogs, and quote cards.

## Overall Design Style

* Clean, modern SaaS interface similar to Notion AI, Canva, and Linear.
* Minimalist but visually rich.
* Rounded corners (16–20px).
* Soft shadows and layered cards.
* Plenty of white space.
* Responsive desktop-first layout.
* Friendly but professional.
* Accessible typography and spacing.

## Brand Identity

**Primary color:** Purple (#6D5EF5)

**Secondary accent:** Cyan (#3ECFCE)

**Success:** Emerald green.

**Background:** Very light gray (#F8FAFC)

**Cards:** White with soft shadow.

**Text:** Dark gray (#111827)

Use gradients only for hero sections and CTA buttons.

Typography:

* Headings: Inter Bold.
* Body: Inter Regular.
* Small labels: Inter Medium.

Icons:
Use a consistent outline icon set similar to Lucide.

---

## Create These Screens

### 1. Landing Page

Hero section:

* Large headline:
  "Turn One Video Into 30 Days of Content."
* Supporting text explaining AI-powered content repurposing.
* Primary CTA: "Start Free"
* Secondary CTA: "Watch Demo"

Right side hero illustration showing:

* One uploaded video.
* AI transforming it into many social media cards.

Sections below:

* Trusted by creators.
* Feature grid.
* How it works (Upload → Analyze → Generate → Publish).
* Testimonials.
* Pricing preview.
* Footer.

---

### 2. Authentication Pages

Design separate pages for:

* Sign Up.
* Login.
* Forgot Password.

Include:

* Email/password fields.
* Google login button placeholder.
* Clean split-screen layout with illustration.

---

### 3. Creator Dashboard

Left sidebar navigation.

Sidebar items:

* Dashboard.
* Projects.
* Content Library.
* AI Studio.
* Calendar.
* Brand Voice.
* Billing.
* Settings.

Top navigation:

* Search.
* Notifications.
* User avatar.

Dashboard widgets:

* Total Projects.
* Content Generated.
* AI Credits Remaining.
* Processing Jobs.

Recent Projects table showing status badges.

Quick Action cards:

* Upload Video.
* Paste YouTube Link.
* Upload Podcast.
* Paste Transcript.

---

### 4. Create Project Page

Large upload area.

Allow four upload options:

* Video File.
* Audio File.
* YouTube URL.
* Transcript.

Show drag-and-drop upload zone.

Right sidebar:

* Supported formats.
* Upload limits.
* Estimated processing time.

---

### 5. Processing Screen

Beautiful progress UI.

Pipeline visualization:

* Upload Complete.
* Audio Extraction.
* Transcription.
* AI Analysis.
* Content Generation.
* Completed.

Animated progress bar.

Display estimated remaining time.

---

### 6. Project Details Page

Show uploaded media preview.

Tabs:

* Overview.
* Transcript.
* Generated Content.
* Clip Suggestions.
* Analytics.

Overview cards:

* Duration.
* Language.
* Topics detected.
* Quotes extracted.
* Hooks found.

---

### 7. Transcript Viewer

Split layout.

Left:
Timestamped transcript.

Right:
AI Summary.

Highlight:

* Key Topics.
* Key Takeaways.
* Quotes.
* Hooks.

Clickable timestamps.

---

### 8. AI Studio (Content Generator)

Main generator interface.

Left panel:
Checkbox list of output types:

* LinkedIn.
* Facebook.
* Instagram.
* X Thread.
* Blog.
* Newsletter.
* TikTok Script.
* Quote Cards.
* Carousel.

Dropdown:
Tone selection:

* Professional.
* Casual.
* Educational.
* Storytelling.
* Bold.
* Funny.

Slider:
Number of outputs.

Large Generate button.

---

### 9. Generated Content Library

Grid/List toggle.

Each content card contains:

* Platform badge.
* Title.
* Preview text.
* Copy button.
* Edit button.
* Regenerate button.
* Favorite button.

Filtering:

* Platform.
* Project.
* Date.
* Tone.

Search bar.

---

### 10. Content Editor

Rich editor layout.

Top toolbar:

* Regenerate.
* Make Shorter.
* Make Longer.
* Rewrite.
* Change Tone.
* Translate.

Live preview of the generated post.

Right sidebar:

* AI Suggestions.
* CTA ideas.
* Hashtags.
* Emoji suggestions.

---

### 11. Clip Suggestions Page

Video timeline interface.

List of recommended clips.

Each card includes:

* Thumbnail placeholder.
* Clip title.
* Hook.
* Start timestamp.
* End timestamp.
* AI Score.
* Suggested caption.

Timeline with highlighted clip segments.

---

### 12. Content Calendar

Monthly calendar.

Drag generated content onto dates.

Colored platform badges.

Upcoming scheduled posts list.

---

### 13. Brand Voice Settings

Profile form.

Fields:

* Brand Name.
* Industry.
* Target Audience.
* Writing Style.
* Preferred Tone.
* Words to Use.
* Words to Avoid.

Section for uploading previous posts to train brand voice.

---

### 14. Billing Page

Cards showing:

* Free Plan.
* Creator Plan.
* Pro Plan.
* Agency Plan.

Usage meter:

* AI Credits.
* Video Minutes Used.
* Remaining Projects.

CTA to Upgrade.

---

### 15. Settings Page

Sections:

* Profile.
* Workspace.
* Notifications.
* Security.
* API Keys.
* Connected Accounts.

Use clean settings cards.

---

## Components to Create

Design reusable components:

* Buttons (Primary, Secondary, Ghost).
* Inputs.
* Select dropdown.
* Toggle switches.
* Tabs.
* Progress bars.
* Status badges.
* Upload cards.
* Content cards.
* Modal dialog.
* Toast notification.
* Empty state illustration.
* Skeleton loading cards.

---

## Dashboard Charts

Include placeholder charts for:

* Content Generated Over Time.
* AI Usage.
* Platform Distribution.
* Processing Success Rate.

Modern bar and line charts.

---

## Responsive Behavior

Generate desktop layouts first (1440px).

Also generate tablet and mobile versions for:

* Dashboard.
* Upload page.
* Content editor.
* Content library.

---

## UX Goals

The interface should feel fast, creator-friendly, and premium.

Every page should have consistent spacing, reusable components, and be ready for implementation in **Next.js + Tailwind CSS + TypeScript**.

Create the design as a complete design system with Auto Layout, reusable components, variants, color styles, typography styles, spacing tokens, and icon components.
