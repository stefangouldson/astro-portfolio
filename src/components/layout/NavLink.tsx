import type { MouseEvent as ReactMouseEvent } from 'react';

export type NavLinkItem = {
  text: string;
  img: string;
  /** Section id on the one-pager, e.g. "about". */
  id: string;
  href: string;
};

type Props = {
  link: NavLinkItem;
  active: boolean;
  tabbable: boolean;
  onNavigate: (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => void;
};

export default function NavLink({ link, active, tabbable, onNavigate }: Props) {
  return (
    <a
      className={`nav-link${active ? ' is-active' : ''}`}
      href={link.href}
      aria-current={active ? 'location' : undefined}
      tabIndex={tabbable ? undefined : -1}
      onClick={(event) => onNavigate(event, link.id)}
    >
      <h3>{link.text}</h3>
      <div className="img-container">
        <img className="nav-link-image" src={link.img} alt="" loading="lazy" />
        <h3 className="viewing">Viewing</h3>
      </div>
    </a>
  );
}
