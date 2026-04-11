/**
 * ═══════════════════════════════════════════════════════════
 *  scroll-animations.js — Premium Spider-Man Scroll Engine
 *  GSAP + ScrollTrigger powered cinematic scroll experience
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  /* ── Wait for GSAP to load ───────────────────────────────── */
  function initScrollAnimations() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      setTimeout(initScrollAnimations, 150);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const isMobile = window.innerWidth <= 768;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    /* ── 1. BACKGROUND PARALLAX ─────────────────────────────── */
    // Background layers move at different speeds creating depth
    const layerSky     = document.querySelector(".layer-sky");
    const layerCityFar = document.querySelector(".layer-city-far");
    const layerCityMid = document.querySelector(".layer-city-mid");

    if (layerSky) {
      gsap.to(layerSky, {
        yPercent: isMobile ? -8 : -15,
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5,
        },
      });
    }

    if (layerCityFar) {
      gsap.to(layerCityFar, {
        yPercent: isMobile ? -5 : -10,
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "bottom bottom",
          scrub: 2,
        },
      });
    }

    if (layerCityMid) {
      gsap.to(layerCityMid, {
        yPercent: isMobile ? -3 : -7,
        x: isMobile ? 0 : 20,
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "bottom bottom",
          scrub: 2.5,
        },
      });
    }

    /* ── 2. SHOP HERO BANNER ENTRANCE ───────────────────────── */
    const heroBanner = document.querySelector(".shop-hero-banner");
    if (heroBanner) {
      gsap.fromTo(
        heroBanner,
        { opacity: 0, y: 60, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.1,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      // Hero title words stagger
      const h1Words = heroBanner.querySelectorAll("h1");
      if (h1Words.length) {
        gsap.fromTo(
          h1Words,
          { opacity: 0, y: 40, skewX: -3 },
          {
            opacity: 1,
            y: 0,
            skewX: 0,
            duration: 0.9,
            stagger: 0.12,
            ease: "power3.out",
            delay: 0.3,
          }
        );
      }

      // Badges pop in
      const badges = heroBanner.querySelectorAll(".shop-badge");
      if (badges.length) {
        gsap.fromTo(
          badges,
          { opacity: 0, scale: 0.7, y: 20 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "back.out(1.7)",
            delay: 0.6,
          }
        );
      }
    }

    /* ── 3. SIDEBAR SLIDE-IN ────────────────────────────────── */
    const sidebar = document.querySelector(".shop-sidebar");
    if (sidebar && !isMobile) {
      gsap.fromTo(
        sidebar,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.9,
          ease: "power3.out",
          delay: 0.2,
          clearProps: "transform",
        }
      );
    }

    /* ── 4. SECTION TITLE REVEAL ────────────────────────────── */
    function animateSectionTitles() {
      const titles = document.querySelectorAll(
        ".grid-section-title:not(.sa-animated)"
      );
      titles.forEach((title) => {
        title.classList.add("sa-animated");
        gsap.fromTo(
          title,
          { opacity: 0, x: -60, skewX: -5 },
          {
            opacity: 1,
            x: 0,
            skewX: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: title,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          }
        );

        // Animated underline line grows from left
        const underline = title.querySelector("::after");
        gsap.fromTo(
          title,
          { "--line-width": "0%" },
          {
            "--line-width": "100%",
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: title,
              start: "top 88%",
            },
          }
        );
      });
    }

    /* ── 5. PRODUCT CARD CINEMATIC REVEAL ───────────────────── */
    function animateProductCards() {
      const cards = document.querySelectorAll(
        ".product-card:not(.sa-animated)"
      );
      if (!cards.length) return;

      cards.forEach((card, i) => {
        card.classList.add("sa-animated");

        // Which column (0,1,2) → different initial offsets
        const col = i % 3;
        const xOffset = col === 0 ? -40 : col === 1 ? 0 : 40;

        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: isMobile ? 50 : 80,
            x: isMobile ? 0 : xOffset,
            scale: 0.92,
            filter: "blur(6px)",
          },
          {
            opacity: 1,
            y: 0,
            x: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: isMobile ? 0.7 : 0.9,
            ease: "power3.out",
            clearProps: "filter,transform",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none none",
            },
            delay: (i % 3) * 0.12, // stagger by column within each row
          }
        );

        /* Individual card: scale + glow on scroll near center */
        if (!isMobile) {
          ScrollTrigger.create({
            trigger: card,
            start: "top 70%",
            end: "bottom 30%",
            onEnter: () => addCardGlow(card),
            onLeave: () => removeCardGlow(card),
            onEnterBack: () => addCardGlow(card),
            onLeaveBack: () => removeCardGlow(card),
          });
        }
      });

      ScrollTrigger.refresh();
    }

    /* ── 6. CARD GLOW STATE ─────────────────────────────────── */
    function addCardGlow(card) {
      card.classList.add("scroll-active");
    }
    function removeCardGlow(card) {
      card.classList.remove("scroll-active");
    }

    /* ── 7. PRODUCT IMAGE ZOOM ON SCROLL ────────────────────── */
    function animateProductImages() {
      const images = document.querySelectorAll(
        ".pc-image-area img:not(.sa-img-animated)"
      );
      images.forEach((img) => {
        img.classList.add("sa-img-animated");
        if (isMobile) return;

        gsap.fromTo(
          img,
          { scale: 1.0 },
          {
            scale: 1.05,
            ease: "none",
            scrollTrigger: {
              trigger: img,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          }
        );
      });
    }

    /* ── 8. BADGE PARALLAX (foreground faster than bg) ──────── */
    function animateBadges() {
      const badges = document.querySelectorAll(
        ".badge-premium:not(.sa-badge-animated)"
      );
      badges.forEach((badge) => {
        badge.classList.add("sa-badge-animated");
        if (isMobile) return;
        gsap.to(badge, {
          y: -15,
          ease: "none",
          scrollTrigger: {
            trigger: badge.closest(".product-card"),
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      });
    }

    /* ── 9. SECTION BG PARALLAX BLOCKS ─────────────────────── */
    function animateGridSections() {
      const sections = document.querySelectorAll(
        ".grid-section:not(.sa-section-animated)"
      );
      sections.forEach((section) => {
        section.classList.add("sa-section-animated");
        if (isMobile) return;

        gsap.fromTo(
          section,
          { backgroundPositionY: "0%" },
          {
            backgroundPositionY: "30%",
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          }
        );
      });
    }

    /* ── 10. SCROLL DEPTH INDICATOR ─────────────────────────── */
    const progressBar = document.createElement("div");
    progressBar.id = "scroll-progress-bar";
    progressBar.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      height: 3px;
      width: 0%;
      background: linear-gradient(90deg, #ff3347, #00aaff, #ff3347);
      background-size: 200% 100%;
      z-index: 9999;
      pointer-events: none;
      transition: width 0.1s linear;
      animation: bar-shimmer 2s linear infinite;
      box-shadow: 0 0 10px rgba(220,30,48,0.8), 0 0 20px rgba(0,170,255,0.5);
    `;
    document.body.appendChild(progressBar);

    const styleTag = document.createElement("style");
    styleTag.textContent = `@keyframes bar-shimmer { 0%{background-position:0% 0%} 100%{background-position:200% 0%} }`;
    document.head.appendChild(styleTag);

    ScrollTrigger.create({
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        progressBar.style.width = (self.progress * 100).toFixed(2) + "%";
      },
    });

    /* ── 11. NAVBAR SCROLL SHRINK ───────────────────────────── */
    const nav = document.querySelector(".spidey-nav");
    if (nav) {
      ScrollTrigger.create({
        start: "top -80px",
        end: "bottom bottom",
        onUpdate: (self) => {
          if (self.scroll() > 80) {
            nav.classList.add("nav-scrolled");
          } else {
            nav.classList.remove("nav-scrolled");
          }
        },
      });
    }

    /* ── 12. EMPTY / LOADING STATE TRANSITIONS ──────────────── */
    const emptyState = document.getElementById("emptyState");
    if (emptyState) {
      gsap.fromTo(
        emptyState,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
        }
      );
    }

    /* ────────────────────────────────────────────────────────── */
    /*   OBSERVE DOM MUTATIONS: Product cards injected later      */
    /* ────────────────────────────────────────────────────────── */
    const shopContainer = document.getElementById("shopContainer");
    if (shopContainer) {
      const mutObs = new MutationObserver(() => {
        // Small delay lets the DOM paint before measuring positions
        setTimeout(() => {
          animateSectionTitles();
          animateProductCards();
          animateProductImages();
          animateBadges();
          animateGridSections();
        }, 80);
      });
      mutObs.observe(shopContainer, { childList: true, subtree: true });
    }

    // Run once on load (catches any already-present elements)
    setTimeout(() => {
      animateSectionTitles();
      animateProductCards();
      animateProductImages();
      animateBadges();
      animateGridSections();
    }, 100);

    /* ── 13. MOUSE TILT ON PRODUCT CARDS ────────────────────── */
    if (!isMobile) {
      document.addEventListener("mousemove", (e) => {
        const cards = document.querySelectorAll(".product-card");
        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          const cx   = rect.left + rect.width / 2;
          const cy   = rect.top  + rect.height / 2;
          const dx   = (e.clientX - cx) / (rect.width  / 2);
          const dy   = (e.clientY - cy) / (rect.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 1.5) {
            gsap.to(card, {
              rotateY: dx * 6,
              rotateX: -dy * 6,
              duration: 0.5,
              ease: "power2.out",
              transformPerspective: 800,
            });
          } else {
            gsap.to(card, {
              rotateY: 0,
              rotateX: 0,
              duration: 0.8,
              ease: "power2.out",
            });
          }
        });
      });
    }
  }

  /* Boot */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScrollAnimations);
  } else {
    initScrollAnimations();
  }
})();
