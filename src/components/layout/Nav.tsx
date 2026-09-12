import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import NavLink, { type NavLinkItem } from './NavLink';

const links: NavLinkItem[] = [
  { text: 'About', img: '/cards.jpeg', id: 'about', href: '/#about' },
  { text: 'Career', img: '/navbar-career.jpg', id: 'career', href: '/#career' },
  { text: 'Projects', img: '/navbar-code.jpg', id: 'projects', href: '/#projects' },
  { text: 'Contact', img: '/contact.jpg', id: 'contact', href: '/#contact' },
];

/** Every section the observer tracks, top to bottom. */
const sectionIds = ['home', ...links.map((link) => link.id)];

type Props = {
  /** Current URL path, so the active card can be flagged off the one-pager. */
  pathname: string;
};

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Distance from the top of the document, walked through the offset chain so the
 * answer is pure layout. getBoundingClientRect() would fold in the -50vh
 * transform <main> is still wearing while the bar slides shut, landing the
 * scroll half a viewport out.
 */
const layoutTop = (element: HTMLElement) => {
  let top = 0;
  let node: HTMLElement | null = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
};

export default function Nav({ pathname }: Props) {
  const [open, setOpen] = useState(false);
  // Project detail pages are not on the one-pager, so flag Projects by path.
  const [active, setActive] = useState(() =>
    pathname.startsWith('/projects/') ? 'projects' : '',
  );

  // The navbar lives behind the page; opening it slides <main> up out of the way.
  useEffect(() => {
    document.documentElement.classList.toggle('nav-open', open);
    return () => document.documentElement.classList.remove('nav-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Which section is under the middle of the viewport. Paused while the nav is
  // open, because sliding <main> up would otherwise flip the highlight to the
  // next section while the visitor is looking at the cards.
  useEffect(() => {
    if (open || !('IntersectionObserver' in window)) return;

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      // Shrink the root to a thin band across the middle of the viewport.
      { rootMargin: '-45% 0px -45% 0px' },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [open]);

  // Anchor navigation: close the bar, then glide to the section behind it.
  const onNavigate = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
      const target = document.getElementById(id);
      // Not on this page (a project detail page) — let the link do its job.
      if (!target) return;

      event.preventDefault();
      setOpen(false);
      setActive(id);

      // scrollTo on the window, not scrollIntoView: `body { overflow-x: hidden }`
      // makes the body a scroll container, and scrollIntoView jumps that one
      // instantly instead of gliding the viewport.
      window.scrollTo({
        top: layoutTop(target),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      history.replaceState(null, '', `#${id}`);
    },
    [],
  );

  return (
    <>
      <button
        id="nav-toggle"
        type="button"
        className={open ? 'isOpen' : 'isClosed'}
        aria-expanded={open}
        aria-controls="site-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      <nav
        id="site-nav"
        className={open ? 'showNav' : 'hideNav'}
        aria-label="Main"
        aria-hidden={!open}
      >
        <div id="nav-links" className={open ? 'showLinks' : 'hideLinks'}>
          {links.map((link) => (
            <NavLink
              key={link.id}
              link={link}
              active={active === link.id}
              tabbable={open}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
