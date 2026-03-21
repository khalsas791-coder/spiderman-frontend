/**
 * cinematic-bg.js — Premium Spider-Man Background Dynamics
 * ─────────────────────────────────────────────────────────
 * Handles parallax movement, particle systems (sparks/embers),
 * and cinematic camera effects.
 */

class CinematicBackground {
    constructor() {
        this.container = document.body;
        this.bgContainer = document.querySelector('.cinematic-bg-container');
        this.layers = {
            bg: document.querySelector('.layer-bg'),
            mid: document.querySelector('.layer-mid'),
            fg: document.querySelector('.layer-fg')
        };
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.lerpAmount = 0.05;

        this.init();
    }

    init() {
        if (!this.bgContainer) return;

        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.animate();
        this.startParticleSystem();
        this.addClickInteractions();
    }

    handleMouseMove(e) {
        this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
        this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
    }

    animate() {
        // Smoothing the movement
        this.currentX += (this.mouseX - this.currentX) * this.lerpAmount;
        this.currentY += (this.mouseY - this.currentY) * this.lerpAmount;

        // Apply parallax to layers
        if (this.layers.bg) {
            this.layers.bg.style.transform = `translate3d(${this.currentX * 10}px, ${this.currentY * 10}px, 0)`;
        }
        if (this.layers.mid) {
            this.layers.mid.style.transform = `translate3d(${this.currentX * 30}px, ${this.currentY * 30}px, 0) scale(1.05)`;
        }
        if (this.layers.fg) {
            this.layers.fg.style.transform = `translate3d(${this.currentX * 50}px, ${this.currentY * 50}px, 0)`;
        }

        requestAnimationFrame(() => this.animate());
    }

    startParticleSystem() {
        const fg = this.layers.fg;
        if (!fg) return;

        setInterval(() => {
            this.createSpark(fg);
        }, 150);

        // Periodic light streaks
        setInterval(() => {
            this.createLightStreak(fg);
        }, 2000);
    }

    createSpark(parent) {
        const spark = document.createElement('div');
        spark.className = 'spark-particle';
        
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const dx = (Math.random() - 0.5) * 200;
        const dy = (Math.random() - 0.5) * 200;
        
        spark.style.left = `${startX}%`;
        spark.style.top = `${startY}%`;
        spark.style.setProperty('--dx', `${dx}px`);
        spark.style.setProperty('--dy', `${dy}px`);
        
        spark.style.animation = `flySpark ${1 + Math.random()}s forwards ease-out`;
        
        parent.appendChild(spark);
        setTimeout(() => spark.remove(), 2000);
    }

    createLightStreak(parent) {
        const streak = document.createElement('div');
        streak.className = 'light-streak';
        
        const top = Math.random() * 80 + 10;
        const duration = 0.5 + Math.random() * 0.5;
        
        streak.style.top = `${top}%`;
        streak.style.left = `-50%`;
        streak.style.width = `${40 + Math.random() * 40}%`;
        
        streak.animate([
            { transform: 'translateX(0)', opacity: 0 },
            { transform: 'translateX(300%)', opacity: 0.3 },
            { transform: 'translateX(500%)', opacity: 0 }
        ], {
            duration: duration * 1000,
            easing: 'linear'
        });

        parent.appendChild(streak);
        setTimeout(() => streak.remove(), duration * 1000);
    }

    addClickInteractions() {
        document.addEventListener('click', () => {
            document.body.classList.add('screen-shake');
            setTimeout(() => document.body.classList.remove('screen-shake'), 300);
        });
    }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.cinematicBg = new CinematicBackground();
});
