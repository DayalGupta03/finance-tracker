/**
 * Custom hooks for scroll-driven interactions.
 * Uses IntersectionObserver for performant reveal animations.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useScrollReveal — Attaches a CSS class when element enters viewport.
 * Respects prefers-reduced-motion.
 */
export function useScrollReveal(options = {}) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Respect reduced motion preference
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            setIsVisible(true);
            return;
        }

        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el); // Only animate once
                }
            },
            { threshold: options.threshold || 0.1, rootMargin: options.rootMargin || '0px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [options.threshold, options.rootMargin]);

    return { ref, isVisible };
}

/**
 * useAnimatedCounter — Smoothly counts up to a target number.
 */
export function useAnimatedCounter(target, duration = 1200, trigger = true) {
    const [value, setValue] = useState(0);
    const frameRef = useRef(null);

    useEffect(() => {
        if (!trigger) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            setValue(target);
            return;
        }

        const startTime = performance.now();
        const startValue = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(startValue + (target - startValue) * eased);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [target, duration, trigger]);

    return value;
}

/**
 * useScrollProgress — Returns 0-100 scroll progress of the page.
 */
export function useScrollProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    const scrolled = window.scrollY;
                    setProgress(docHeight > 0 ? (scrolled / docHeight) * 100 : 0);
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return progress;
}
