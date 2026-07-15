import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let cleanup: (() => void) | undefined;

/**
 * Initializes current-route reveals and the optional partner marquee, releasing the prior route first.
 * @returns Nothing. Existing GSAP contexts, tweens, and listeners are removed before rebuilding.
 */
export function initSiteMotion(): void {
  cleanup?.();
  cleanup = undefined;
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  const reveals = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]'),
  );
  if (reduceMotion) {
    reveals.forEach((element) => element.classList.add('is-visible'));
    cleanup = undefined;
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  const context = gsap.context(() => {
    reveals.forEach((element, index) =>
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.65,
          delay: Math.min(index * 0.04, 0.2),
          ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        },
      ),
    );
    const track = document.querySelector<HTMLElement>('[data-partner-track]');
    const viewport = track?.parentElement;
    if (track && viewport) {
      const tween = gsap.to(track, {
        xPercent: -50,
        duration: 32,
        ease: 'none',
        repeat: -1,
      });
      const pause = (): void => {
        tween.pause();
      };
      const play = (): void => {
        tween.play();
      };
      viewport.addEventListener('mouseenter', pause);
      viewport.addEventListener('mouseleave', play);
      viewport.addEventListener('focusin', pause);
      viewport.addEventListener('focusout', play);
      cleanup = () => {
        viewport.removeEventListener('mouseenter', pause);
        viewport.removeEventListener('mouseleave', play);
        viewport.removeEventListener('focusin', pause);
        viewport.removeEventListener('focusout', play);
        context.revert();
      };
    }
  });
  cleanup ??= () => context.revert();
}
