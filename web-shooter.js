/**
 * web-shooter.js — Premium Spider-Man Web Shooting Effect
 * ─────────────────────────────────────────────────────────
 * Shoots a dynamic SVG/Canvas web from the cursor to the cart icon.
 */

class WebShooter {
    constructor() {
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("style", "position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999;");
        document.body.appendChild(this.svg);
        this.activeWebs = [];
    }

    shoot(startX, startY, targetSelector = "#cartToggle") {
        const target = document.querySelector(targetSelector);
        if (!target) return;

        const targetRect = target.getBoundingClientRect();
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#ffffff");
        path.setAttribute("stroke-width", "3");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("style", "filter: drop-shadow(0 0 5px rgba(255,255,255,0.8)); opacity: 0.9;");

        // Create a slightly curved path
        const cpX = (startX + endX) / 2 + (Math.random() * 100 - 50);
        const cpY = (startY + endY) / 2 - 100;

        const d = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
        path.setAttribute("d", d);

        // Animation using dasharray
        const length = 1000; // Large arbitrary length
        path.setAttribute("stroke-dasharray", length);
        path.setAttribute("stroke-dashoffset", length);

        this.svg.appendChild(path);

        // GSAP Animation
        gsap.to(path, {
            strokeDashoffset: 0,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => {
                // Flash the target
                gsap.to(target, { scale: 1.3, duration: 0.1, yoyo: true, repeat: 1 });
                
                // Fade out web
                gsap.to(path, {
                    opacity: 0,
                    duration: 0.3,
                    delay: 0.1,
                    onComplete: () => path.remove()
                });
            }
        });

        // Add impact particles at end
        this.createImpact(endX, endY);
    }

    createImpact(x, y) {
        for (let i = 0; i < 8; i++) {
            const dot = document.createElement("div");
            dot.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                pointer-events: none;
                z-index: 10000;
                box-shadow: 0 0 10px white;
            `;
            document.body.appendChild(dot);

            gsap.to(dot, {
                x: (Math.random() - 0.5) * 60,
                y: (Math.random() - 0.5) * 60,
                opacity: 0,
                scale: 0,
                duration: 0.5,
                onComplete: () => dot.remove()
            });
        }
    }
}

window.webShooter = new WebShooter();
