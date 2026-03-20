/* spidey-effects.js - Cinematic Marvel-style Canvas Enhancements */

window.initSpideyEffects = function() {
    if (window._spideyEffectsInitialized) return;
    window._spideyEffectsInitialized = true;

    // Create Canvas Overlay
    const canvas = document.createElement('canvas');
    canvas.id = "spideyCanvasOverlay";
    Object.assign(canvas.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "9998",
        touchAction: "none"
    });
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });
    canvas.width = width;
    canvas.height = height;

    // ----- 1. Pendulum Web Swing State -----
    let swingAngle = 0;
    let swingSpeed = 0.02;
    let swingAmplitude = 0.35; // Initial pendulum offset
    let time = 0;

    // ----- 2. Cursor Glow & Trail State -----
    let mouse = { x: width / 2, y: height / 2 };
    let targetMouse = { x: width / 2, y: height / 2 };
    let glowIntensity = 0;
    
    let particles = [];
    let webs = [];

    // Subtle Spider icon image logic
    const spideyIcon = new Image();
    spideyIcon.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZjMzNDciIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1ib2ciPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjgiLz48cGF0aCBkPSJNMjAgN2wtNC41IDItNCA0bS04LTdsNC41IDIgNCA0bTExIDlsLTQuNS0yLTQtNG0tOC05bDQuNSAyLTQgLTQiLz48L3N2Zz4=";

    // Track exact mouse position reliably
    window.addEventListener('mousemove', (e) => {
        targetMouse.x = e.clientX;
        targetMouse.y = e.clientY;
    }, {passive: true});

    window.addEventListener('touchstart', (e) => {
        targetMouse.x = e.touches[0].clientX;
        targetMouse.y = e.touches[0].clientX;
    }, {passive: true});

    // Interaction 1: Scroll physics
    window.addEventListener('scroll', () => {
        swingSpeed = Math.min(swingSpeed + 0.015, 0.1); // Speed up
        swingAmplitude = Math.min(swingAmplitude + 0.04, 0.8); // Increase amplitude
    }, {passive: true});

    // Interaction 2: Click interactions (Web Shoot + Pendulum Jerk)
    window.addEventListener('click', (e) => {
        // Jerk pendulum based on click distance
        const dx = e.clientX - (width/2);
        swingAmplitude = Math.min(swingAmplitude + Math.abs(dx)*0.001, 1.2);
        swingSpeed = 0.06;

        // Shoot web from pendulum to clicked point
        webs.push({
            targetX: e.clientX,
            targetY: e.clientY,
            progress: 0,
            impact: false
        });
        
        // Add impact burst immediately for snappiness
        createImpact(e.clientX, e.clientY);
        
        // Optional subtle screen shake via CSS
        document.body.style.transform = "translate(2px, -2px)";
        setTimeout(() => document.body.style.transform = "translate(0, 0)", 50);
    });

    function createImpact(x, y) {
        for(let i=0; i<15; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 1.0,
                color: Math.random() > 0.5 ? '#ffffff' : '#00aaff'
            });
        }
    }

    function createTrailParticle(x, y) {
        if(Math.random() > 0.6) {
            particles.push({
                x: x + (Math.random() - 0.5) * 30, 
                y: y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3 + 1,
                life: 1.0,
                color: Math.random() > 0.5 ? 'rgba(220,30,48,0.7)' : 'rgba(0,170,255,0.7)'
            });
        }
    }

    function render() {
        ctx.clearRect(0, 0, width, height);
        time++;

        // --- Physics Update ---
        swingAngle = Math.sin(time * swingSpeed) * swingAmplitude;
        // Gravity / friction
        swingAmplitude = Math.max(swingAmplitude * 0.99, 0.1); 
        swingSpeed = Math.max(swingSpeed * 0.985, 0.02);

        const dx = targetMouse.x - mouse.x;
        const dy = targetMouse.y - mouse.y;
        mouse.x += dx * 0.15;
        mouse.y += dy * 0.15;
        
        const velocity = Math.sqrt(dx*dx + dy*dy);
        if (velocity > 6) {
            glowIntensity = Math.min(glowIntensity + 0.15, 1);
            createTrailParticle(mouse.x, mouse.y);
        } else {
            glowIntensity = Math.max(glowIntensity - 0.03, 0);
        }

        // --- 1. Draw Pendulum Web ---
        const anchorX = width / 2;
        const anchorY = -20; // Slightly above screen top
        // The length stretches slightly as it swings to simulate tension
        const bobLength = height * 0.45 + (Math.abs(swingAngle) * 60); 
        const bobX = anchorX + Math.sin(swingAngle) * bobLength;
        const bobY = anchorY + Math.cos(swingAngle) * bobLength;

        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY);
        // Add subtle curving to the web line
        ctx.bezierCurveTo(
            anchorX + Math.sin(swingAngle)*bobLength*0.3,
            anchorY + Math.cos(swingAngle)*bobLength*0.3,
            bobX - Math.sin(swingAngle)*bobLength*0.2,
            bobY - Math.cos(swingAngle)*bobLength*0.2,
            bobX, bobY
        );
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 1.2;
        ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (spideyIcon.complete) {
            ctx.save();
            ctx.translate(bobX, bobY);
            ctx.rotate(-swingAngle * 1.2);
            ctx.drawImage(spideyIcon, -12, -12, 24, 24);
            ctx.restore();
        }

        // --- 2. Draw Shooting Webs ---
        for(let i = webs.length - 1; i >= 0; i--) {
            const w = webs[i];
            const startX = bobX; 
            const startY = bobY;

            w.progress += 0.18; // Very fast flash (0.2s approx)
            if(w.progress > 1) {
                w.progress = 1;
                if(!w.impact) {
                    createImpact(w.targetX, w.targetY);
                    w.impact = true;
                }
                w.fade = (w.fade || 1) - 0.1;
            }

            const currentX = startX + (w.targetX - startX) * w.progress;
            const currentY = startY + (w.targetY - startY) * w.progress;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.strokeStyle = `rgba(255, 255, 255, ${w.fade !== undefined ? w.fade : 0.9})`;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = "white";
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.shadowBlur = 0;

            if(w.fade <= 0) webs.splice(i, 1);
        }

        // --- 3. Draw Particles ---
        for(let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity applied to particles
            p.life -= 0.03;

            if(p.life <= 0) {
                particles.splice(i, 1);
            } else {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.random()*2+1, 0, Math.PI*2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // --- 4. Draw Cursor Glow Light ---
        if (glowIntensity > 0) {
            const radius = 80 + (glowIntensity * 50);
            const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, radius);
            gradient.addColorStop(0, `rgba(220, 30, 48, ${0.25 * glowIntensity})`);
            gradient.addColorStop(0.4, `rgba(0, 170, 255, ${0.15 * glowIntensity})`);
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, radius, 0, Math.PI*2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        
        requestAnimationFrame(render);
    }
    
    render();
};
