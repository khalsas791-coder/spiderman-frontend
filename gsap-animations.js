/**
 * Premium Spider-Man Cinematic Parallax Animation
 * Using GSAP & ScrollTrigger
 */

document.addEventListener("DOMContentLoaded", () => {
  // Register GSAP Plugin
  gsap.registerPlugin(ScrollTrigger);

  // Try grabbing #cinematicHero (product.html) or fallback to #hero
  const heroSection = document.getElementById("cinematicHero") || document.getElementById("hero");
  if (!heroSection) return; // Exit if no hero section is found

  const layerBg = document.getElementById("layerBg");
  const layerMid = document.getElementById("layerMid");
  const layerSpidey = document.getElementById("layerSpidey");
  const wrapper = document.getElementById("parallaxWrapper");

  // Disable intense features on mobile to keep 60fps
  const isMobile = window.innerWidth <= 768;

  // Initial State Setting for Layers to enhance depth
  gsap.set(layerBg, { scale: 1.1, z: isMobile ? 0 : -200, transformOrigin: 'center center' });
  gsap.set(layerMid, { scale: 1.1, z: isMobile ? 0 : -100, transformOrigin: 'center center' });
  gsap.set(layerSpidey, { scale: 1, z: 0, transformOrigin: '40% 60%' }); // Anchor point feels more realistic for swinging

  /**
   * 1) MAIN LAYER PARALLAX SCROLL
   * Uses a timeline linked to the scroll position
   */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: heroSection,
      start: "top top",
      end: "+=150%", // Timeline continues for 1.5x of the viewport height
      scrub: 1.2, // Smoothes out the scroll capture for premium feel
      anticipatePin: 1
    }
  });

  // Layer Bg (Deep City) -> moves down slowly, slowly zooms out
  tl.to(layerBg, {
    yPercent: 20,
    scale: 1,
    filter: isMobile ? 'brightness(0.6) blur(2px)' : 'brightness(0.5) blur(4px)',
    ease: "none"
  }, 0);

  // Layer Mid (Foggy Buildings) -> moves down slightly faster
  tl.to(layerMid, {
    yPercent: 35,
    scale: 1.05,
    rotateZ: -1, // Subtle cinematic tilt
    ease: "none"
  }, 0);

  // Layer Spidey (Foreground Subject) -> Swings across and up
  tl.to(layerSpidey, {
    yPercent: -45,          // Vertical moving up (Spidey falls / swings up relative to camera)
    xPercent: 15,           // Drifting horizontally inside the viewport
    scale: 1.3,             // Zooming in (getting closer to camera)
    rotateZ: 8,             // Tilting forward for realistic swing arc
    rotateY: 10,            // Depth rotation
    filter: "brightness(1) blur(0px)",
    ease: "power2.inOut"    // Arc-like curve (starts slow, accelerates, slows down)
  }, 0);

  // Fade out hero layers before it transitions to the next section completely
  tl.to(wrapper, {
    opacity: 0,
    ease: "power1.inOut"
  }, 0.6); // Starts fading out at 60% of the scroll timeline progress


  /**
   * 2) PRODUCT REVEAL (FADE UP)
   * Elements in the #about or #shop section fade up luxuriously when scrolling past the hero
   */
  gsap.utils.toArray('.glass-card').forEach((card, index) => {
    gsap.fromTo(card, 
      { opacity: 0, y: 50, rotationX: isMobile ? 0 : 10 },
      {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%", 
          toggleActions: "play none none reverse"
        }
      }
    );
  });

  // Also animate product cards (dynamically injected ones)
  const animProducts = () => {
    const cards = gsap.utils.toArray('.hp-product-card:not(.gsap-animated), .product-card:not(.gsap-animated)');
    if (cards.length > 0) {
      cards.forEach(card => card.classList.add('gsap-animated'));
      gsap.fromTo(cards, 
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15, // Stagger effect
          ease: "power3.out",
          scrollTrigger: {
            trigger: '.shop', // Group trigger 
            start: "top 80%", 
            toggleActions: "play none none reverse"
          }
        }
      );
      ScrollTrigger.refresh();
    }
  };

  // Initial check
  setTimeout(animProducts, 500);

  // Observer for dynamic product injection
  const shopGrid = document.getElementById("homeProductsGrid");
  if (shopGrid) {
    const mutObserver = new MutationObserver(() => animProducts());
    mutObserver.observe(shopGrid, { childList: true });
  }

  /**
   * 3) MOUSE-BASED PARALLAX (Subtle follow)
   * Moves layers slightly based on cursor position when hovering the hero
   * (Disabled tracking on mobile for performance)
   */
  if (!isMobile) {
    heroSection.addEventListener("mousemove", (e) => {
      // Calculate cursor position mapping to (-1 to 1)
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      // Move layers at varying intensities
      gsap.to(layerBg, {
        x: -x * 15,
        y: -y * 15,
        duration: 1,
        ease: "power2.out"
      });

      gsap.to(layerMid, {
        x: -x * 30,
        y: -y * 30,
        duration: 1,
        ease: "power2.out"
      });

      gsap.to(layerSpidey, {
        x: x * 20, // Moves inverse to background, amplifies parallax illusion
        y: y * 20,
        rotationY: x * 5, // Tilts the image based on mouse X
        rotationX: -y * 5, // Tilts the image based on mouse Y
        duration: 0.8,
        ease: "power2.out"
      });
    });

    // Reset when leaving hero
    heroSection.addEventListener("mouseleave", () => {
      gsap.to([layerBg, layerMid, layerSpidey], {
        x: 0, y: 0, rotationY: 0, rotationX: 0, duration: 1.5, ease: "power2.out"
      });
    });
  }

});
