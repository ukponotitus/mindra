import { Link } from "react-router";
import Logo from "./Logo";
import { useCtaLinks } from "./useCtaLinks";

// The section links lead back to the landing page, so they also work from the privacy, terms and data deletion pages.
const home = import.meta.env.BASE_URL;

export default function LandingFooter() {
  const { signedIn, startTo, loginTo } = useCtaLinks();
  const columns = [
    {
      title: "Product",
      links: [
        { label: "How it works", href: `${home}#how` },
        { label: "Who it's for", href: `${home}#who` },
        { label: "Features", href: `${home}#features` },
        { label: "What's live", href: `${home}#roadmap` },
      ],
    },
    {
      title: "Plans",
      links: [
        { label: "Pricing", href: `${home}#pricing` },
        { label: "FAQ", href: `${home}#faq` },
      ],
    },
    {
      title: "Account",
      links: signedIn
        ? [{ label: "Open your workspace", to: startTo }]
        : [
            { label: "Start free", to: startTo },
            { label: "Log in", to: loginTo },
          ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Terms of Service", to: "/terms" },
        { label: "Data Deletion", to: "/data-deletion" },
      ],
    },
  ];

  return (
    <footer className="bg-[#0B0D1C] px-6 pt-10 pb-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Logo onDark />
            <p className="mt-6 text-3xl leading-tight font-medium text-balance">
              Create, repurpose
              <br />
              <span className="text-white/45">and publish.</span>
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4 sm:gap-x-12 lg:gap-x-16">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-[15px] font-semibold">{column.title}</p>
                <ul className="mt-3 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {"to" in link ? (
                        <Link to={link.to} className="text-[15px] text-white/60 transition-colors hover:text-white">
                          {link.label}
                        </Link>
                      ) : (
                        <a href={link.href} className="text-[15px] text-white/60 transition-colors hover:text-white">
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Mindra. All rights reserved.</span>
          <span>Made for people who create every week.</span>
        </div>
      </div>
    </footer>
  );
}
