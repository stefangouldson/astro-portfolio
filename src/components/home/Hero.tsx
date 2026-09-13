import { useEffect, useRef } from 'react';
import { armScramble } from '../../lib/scramble';
import { motionAllowed } from '../../lib/motion';

/**
 * Split hero: the dark half tracks the pointer, wiping across to reveal
 * the orange half underneath. Both headings land scrambled and decrypt
 * themselves once the hero is in view — no hover, unlike Key Skills.
 */
export default function Hero() {
  const welcomeRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  const revealTo = (clientX: number) => {
    const left = leftRef.current;
    if (!left) return;
    left.style.width = `${(clientX / window.innerWidth) * 100}%`;
  };

  useEffect(() => {
    const root = welcomeRef.current;
    if (!root || !motionAllowed()) return;

    // Both halves are armed as one group, so the wipe never uncovers a
    // decrypted right side under a still-ciphered left one.
    const fx = armScramble(root);

    if (!('IntersectionObserver' in window)) {
      fx.decrypt();
      return () => fx.stop();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          fx.decrypt();
          observer.disconnect();
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(root);
    return () => {
      observer.disconnect();
      fx.stop();
    };
  }, []);

  return (
    <div
      className="welcome"
      ref={welcomeRef}
      onMouseMove={(e) => revealTo(e.clientX)}
      onTouchMove={(e) => revealTo(e.touches[0].clientX)}
    >
      <div id="left-side" className="side" ref={leftRef}>
        <h1 className="title">
          <span className="scramble" data-scramble>
            <span className="scramble__real">Hi there, I'm</span>
            <span className="scramble__mask" aria-hidden="true" />
          </span>
          {/* Courgette is proportional, so its cipher sticks to letters. */}
          <span className="fancy scramble" data-scramble="letters">
            <span className="scramble__real">Stefan Gouldson</span>
            <span className="scramble__mask" aria-hidden="true" />
          </span>
          <span className="visually-hidden">, a software dev</span>
        </h1>
      </div>
      {/* Decorative twin of the heading — announced once, on the left. */}
      <div id="right-side" className="side" aria-hidden="true">
        <div className="title">
          <span className="scramble" data-scramble>
            <span className="scramble__real">Hi there, I'm</span>
            <span className="scramble__mask" aria-hidden="true" />
          </span>
          <span className="fancy scramble" data-scramble="letters">
            <span className="scramble__real">a software dev</span>
            <span className="scramble__mask" aria-hidden="true" />
          </span>
        </div>
      </div>
      <div className="arrow" aria-hidden="true"></div>
    </div>
  );
}
