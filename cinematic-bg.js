/**
 * cinematic-bg.js — Premium Spider-Man Background Dynamics
 * Updated to exactly match auth.js background implementation
 */

document.addEventListener('DOMContentLoaded', () => {
    startBackgroundMovements();
    spawnRandomParticles();
});

function startBackgroundMovements() {
    const bgContainer = document.getElementById('cinematicBg');
    if (!bgContainer) return;

    document.addEventListener('mousemove', (e) => {
        // Only trigger parallax if the background is visible
        if (bgContainer.style.display === 'none') return;

        const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
        const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;
        
        if (typeof gsap !== 'undefined') {
            gsap.to('#cinematicBg .layer-city-near', { x: xPercent * 15, y: yPercent * 10, duration: 1.5 });
            gsap.to('#cinematicBg .layer-city-mid', { x: xPercent * 8, y: yPercent * 6, duration: 1.5 });
            gsap.to('#cinematicBg .layer-city-far', { x: xPercent * 4, y: yPercent * 3, duration: 1.5 });
        }
    });
}

function spawnRandomParticles() {
    const container = document.getElementById('particlesBg');
    if (!container) return;

    // We only spawn them once, they animate indefinitely via GSAP
    for(let i=0; i<30; i++) {
        const p = document.createElement('div');
        const size = Math.random() * 3 + 1;
        p.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${Math.random() > 0.5 ? '#00aaff' : '#ff3347'};
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.5 + 0.2};
            filter: blur(1px);
            pointer-events: none;
        `;
        container.appendChild(p);
        
        if (typeof gsap !== 'undefined') {
            gsap.to(p, {
                y: "-=50",
                duration: Math.random() * 5 + 5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: Math.random() * 5
            });
        }
    }
}
