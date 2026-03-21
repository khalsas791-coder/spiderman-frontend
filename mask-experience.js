import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class MaskExperience {
    constructor() {
        this.container = document.getElementById('mask-container');
        this.canvas = document.getElementById('mask-canvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });

        this.mask = null;
        this.mouse = new THREE.Vector2();
        this.targetRotation = new THREE.Vector2();
        
        this.init();
    }

    init() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.camera.position.set(0, 0, 5);

        // ── PREMIUM LIGHTING ─────────────────────────────────────────
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        // Key Light (Red)
        const mainLight = new THREE.DirectionalLight(0xff3347, 3);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        // Fill Light (Blue)
        const blueFillLight = new THREE.PointLight(0x0036a1, 2, 10);
        blueFillLight.position.set(-5, -2, 2);
        this.scene.add(blueFillLight);

        // Rim Light (Top White)
        const rimLight = new THREE.SpotLight(0xffffff, 2);
        rimLight.position.set(0, 8, -5);
        rimLight.angle = 0.5;
        this.scene.add(rimLight);

        // Neon Glow (Point Light inside/near mask)
        this.glowLight = new THREE.PointLight(0xff3347, 2, 5);
        this.scene.add(this.glowLight);

        // ── GROUND PLANE FOR SHADOWS ─────────────────────────────────
        const planeGeometry = new THREE.PlaneGeometry(20, 20);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const ground = new THREE.Mesh(planeGeometry, planeMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // ── LOADER ──────────────────────────────────────────────────
        const loader = new GLTFLoader();
        loader.load('./models/mask.glb', (gltf) => {
            this.mask = gltf.scene;
            
            this.mask.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    // Add subtle emissive glow to red parts if possible
                    if (node.material) {
                        node.material.envMapIntensity = 1.5;
                        if (node.material.name.toLowerCase().includes('red') || node.material.color.r > 0.5) {
                            node.material.emissive = new THREE.Color(0x330000);
                            node.material.emissiveIntensity = 0.5;
                        }
                    }
                }
            });

            // Center and scale
            const box = new THREE.Box3().setFromObject(this.mask);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.6; 
            
            this.camera.position.z = cameraZ;
            this.mask.position.sub(center);
            
            this.scene.add(this.mask);
            this.animate();
        }, undefined, (error) => {
            console.error('Error loading model:', error);
        });

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enableZoom = false; // Disable zoom for card-like feel
        this.controls.autoRotate = false;
        this.controls.maxPolarAngle = Math.PI / 1.5;
        this.controls.minPolarAngle = Math.PI / 3;

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        this.setupUI();
    }

    onMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.mask) {
            this.targetRotation.y = this.mouse.x * 0.4; // More responsive tilt
            this.targetRotation.x = -this.mouse.y * 0.3;
        }
    }

    onResize() {
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    setupUI() {
        const addBtn = document.getElementById('add-to-cart');
        const countBadge = document.getElementById('cart-count');
        
        // Sync with spideyCart
        const updateCount = () => {
            const cart = JSON.parse(localStorage.getItem('spideyCart') || '[]');
            const count = cart.reduce((s, i) => s + i.qty, 0);
            if (countBadge) countBadge.textContent = count;
        };
        updateCount();

        addBtn.addEventListener('click', () => {
            // Web shooting logic will be called here from another script or injected
            // For now, trigger existing logic
            let cart = JSON.parse(localStorage.getItem('spideyCart') || '[]');
            const product = { id: "mask-3d", name: "Spider-Man Premium Mask", price: 49.99, image: "" };
            const existing = cart.find(i => i.id === product.id);
            if(existing) {
                existing.qty = Math.min(20, existing.qty + 1);
                existing.lineTotal = existing.qty * existing.price;
            } else {
                cart.push({ ...product, qty: 1, lineTotal: 49.99 });
            }
            localStorage.setItem('spideyCart', JSON.stringify(cart));
            updateCount();
            
            // Premium Feedback
            addBtn.classList.add('premium-pulse');
            setTimeout(() => addBtn.classList.remove('premium-pulse'), 600);
            
            if (countBadge) {
                countBadge.classList.add('bounce-in');
                setTimeout(() => countBadge.classList.remove('bounce-in'), 500);
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.mask) {
            // Realistic floating
            const time = Date.now() * 0.001;
            this.mask.position.y = Math.sin(time) * 0.15;
            this.mask.position.x = Math.cos(time * 0.5) * 0.05;
            
            // Mouse following (tilt)
            this.mask.rotation.y += (this.targetRotation.y - this.mask.rotation.y) * 0.1;
            this.mask.rotation.x += (this.targetRotation.x - this.mask.rotation.x) * 0.1;

            // Reflect live lighting
            if (this.glowLight) {
                this.glowLight.intensity = 2 + Math.sin(time * 3) * 0.5; // Pulsing glow
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Spark Particles
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 4 + 2;
        p.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${Math.random() > 0.5 ? '#dc1e30' : '#0036a1'};
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            box-shadow: 0 0 10px ${Math.random() > 0.5 ? '#dc1e30' : '#0036a1'};
            opacity: ${Math.random() * 0.5 + 0.2};
            pointer-events: none;
            transition: transform ${Math.random() * 10 + 5}s linear;
        `;
        container.appendChild(p);
        
        // Move randomly
        setInterval(() => {
            p.style.transform = `translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px)`;
        }, 100);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new MaskExperience();
    createParticles();
});
