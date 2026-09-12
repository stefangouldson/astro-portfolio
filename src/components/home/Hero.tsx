import { useRef } from 'react';

/**
 * Split hero: the dark half tracks the pointer, wiping across to reveal
 * the orange half underneath.
 */
export default function Hero() {
  const leftRef = useRef<HTMLDivElement>(null);

  const revealTo = (clientX: number) => {
    const left = leftRef.current;
    if (!left) return;
    left.style.width = `${(clientX / window.innerWidth) * 100}%`;
  };

  return (
    <div
      className="welcome"
      onMouseMove={(e) => revealTo(e.clientX)}
      onTouchMove={(e) => revealTo(e.touches[0].clientX)}
    >
      <div id="left-side" className="side" ref={leftRef}>
        <h1 className="title">
          Hi there, I'm <br />
          <span className="fancy">Stefan Gouldson</span>
          <span className="visually-hidden">, a software dev</span>
        </h1>
      </div>
      {/* Decorative twin of the heading — announced once, on the left. */}
      <div id="right-side" className="side" aria-hidden="true">
        <div className="title">
          Hi there, I'm <br />
          <span className="fancy">a software dev</span>
        </div>
      </div>
      <div className="arrow" aria-hidden="true"></div>
    </div>
  );
}
