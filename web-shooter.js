/**
 * web-shooter.js — Premium Marvel-Style Web Interaction
 * ─────────────────────────────────────────────────────────
 */

class WebShooter {
    constructor() {
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("style", "position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999;");
        document.body.appendChild(this.svg);
        this.isShooting = false;
        
        // Add global click listener for free-shooting
        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
            this.shoot(e.clientX, e.clientY);
        });
    }

    shoot(targetX, targetY) {
        if (this.isShooting) return;
        this.isShooting = true;

        // Origin point: bottom right (like Spidey swinging in/shooting from side)
        const startX = window.innerWidth * 1.1; 
        const startY = window.innerHeight * 0.9;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "white");
        path.setAttribute("stroke-width", "4");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("style", "filter: drop-shadow(0 0 8px rgba(255,255,255,0.9)); opacity: 1;");

        // Organic Bezier Curve
        const cp1X = (startX + targetX) / 2 + (Math.random() - 0.5) * 200;
        const cp1Y = (startY + targetY) / 2 - 300; // Curve upwards
        
        const d = `M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${targetX} ${targetY}`;
        path.setAttribute("d", d);

        // Animation preparation
        const length = 2000;
        path.setAttribute("stroke-dasharray", length);
        path.setAttribute("stroke-dashoffset", length);

        this.svg.appendChild(path);

        // Shoot Animation
        gsap.to(path, {
            strokeDashoffset: 0,
            duration: 0.25,
            ease: "power2.out",
            onComplete: () => {
                this.createImpact(targetX, targetY);
                this.performScreenShake();
                
                // Fade out and remove
                gsap.to(path, {
                    opacity: 0,
                    strokeWidth: 0,
                    duration: 0.3,
                    delay: 0.1,
                    onComplete: () => {
                        path.remove();
                        this.isShooting = false;
                    }
                });
            }
        });

        // Add recoil feeling
        gsap.fromTo(document.body, { y: 0 }, { y: 2, duration: 0.05, yoyo: true, repeat: 1 });
    }

    createImpact(x, y) {
        // Impact Burst Container
        const burst = document.createElement('div');
        burst.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 0;
            height: 0;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(burst);

        // Particles
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            const size = Math.random() * 4 + 2;
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 100;
            
            p.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: white;
                border-radius: 50%;
                box-shadow: 0 0 10px white;
                opacity: 0.8;
            `;
            burst.appendChild(p);

            gsap.to(p, {
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                opacity: 0,
                scale: 0,
                duration: 0.4 + Math.random() * 0.4,
                ease: "power3.out",
                onComplete: () => p.remove()
            });
        }

        // Ripple Effect
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            border: 2px solid rgba(255,255,255,0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
        `;
        burst.appendChild(ripple);
        gsap.to(ripple, {
            width: 150,
            height: 150,
            opacity: 0,
            duration: 0.5,
            onComplete: () => ripple.remove()
        });

        setTimeout(() => burst.remove(), 1000);
    }

    performScreenShake() {
        const tl = gsap.timeline();
        tl.to(document.body, { x: -2, duration: 0.05 })
          .to(document.body, { x: 2, duration: 0.05 })
          .to(document.body, { x: -1, duration: 0.05 })
          .to(document.body, { x: 0, duration: 0.05 });
    }
}

// Ensure GSAP is loaded before initializing
const initWebShooter = () => {
    if (window.gsap) {
        window.webShooter = new WebShooter();
    } else {
        setTimeout(initWebShooter, 100);
    }
};

initWebShooter();
