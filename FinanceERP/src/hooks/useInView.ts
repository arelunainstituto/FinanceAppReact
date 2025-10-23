import { useEffect, useState, useRef, RefObject } from 'react';

interface UseInViewOptions {
  threshold?: number; // 0 a 1 - porcentagem do elemento visível para trigger
  rootMargin?: string; // Margem ao redor do viewport (ex: "-100px")
  triggerOnce?: boolean; // Se true, anima apenas uma vez
}

export const useInView = (
  options: UseInViewOptions = {}
): [RefObject<any>, boolean] => {
  const {
    threshold = 0.1, // 10% visível
    rootMargin = '0px',
    triggerOnce = true,
  } = options;

  const elementRef = useRef<any>(null);
  const [isInView, setIsInView] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Se já triggerou e é triggerOnce, não faz nada
    if (hasTriggered.current && triggerOnce) return;

    // Criar Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            hasTriggered.current = true;

            // Se triggerOnce, desconectar observer após trigger
            if (triggerOnce) {
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            // Se não é triggerOnce, pode sair da view
            setIsInView(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    // Cleanup
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [elementRef, isInView];
};

// Hook especializado para React Native Web
export const useScrollPosition = (
  options: UseInViewOptions = {}
): [RefObject<any>, boolean] => {
  const {
    threshold = 0.1,
    rootMargin = 0,
    triggerOnce = true,
  } = options;

  const elementRef = useRef<any>(null);
  const [isInView, setIsInView] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const checkPosition = () => {
      const element = elementRef.current;
      if (!element) return;

      // Se já triggerou e é triggerOnce, não faz nada
      if (hasTriggered.current && triggerOnce) return;

      // Para React Native Web, usar measureInWindow
      if (element.measureInWindow) {
        element.measureInWindow(
          (x: number, y: number, width: number, height: number) => {
            const windowHeight = window.innerHeight;
            const margin = typeof rootMargin === 'number' ? rootMargin : 0;

            // Verifica se está no viewport
            const isVisible =
              y + height * threshold >= margin &&
              y <= windowHeight - margin;

            if (isVisible) {
              setIsInView(true);
              hasTriggered.current = true;
            } else if (!triggerOnce) {
              setIsInView(false);
            }
          }
        );
      } else if (element.getBoundingClientRect) {
        // Fallback para elementos web normais
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const margin = typeof rootMargin === 'number' ? rootMargin : 0;

        const isVisible =
          rect.top + rect.height * threshold >= margin &&
          rect.top <= windowHeight - margin;

        if (isVisible) {
          setIsInView(true);
          hasTriggered.current = true;
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      }
    };

    // Verificar posição inicial
    checkPosition();

    // Adicionar listener de scroll
    const handleScroll = () => {
      requestAnimationFrame(checkPosition);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [elementRef, isInView];
};

