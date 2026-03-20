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
        this.renderer.toneMappingExposure = 1.2;

        this.camera.position.set(0, 0, 5);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xff3347, 2);
        mainLight.position.set(5, 5, 5);
        this.scene.add(mainLight);

        const blueFillLight = new THREE.DirectionalLight(0x0036a1, 1.5);
        blueFillLight.position.set(-5, -2, 2);
        this.scene.add(blueFillLight);

        const rimLight = new THREE.SpotLight(0xffffff, 1);
        rimLight.position.set(0, 5, -5);
        this.scene.add(rimLight);

        // Loader
        const loader = new GLTFLoader();
        loader.load('./models/mask.glb', (gltf) => {
            this.mask = gltf.scene;
            
            // Center and scale
            const box = new THREE.Box3().setFromObject(this.mask);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.5; 
            
            this.camera.position.z = cameraZ;
            this.mask.position.sub(center);
            
            this.scene.add(this.mask);

            // Floating animation
            this.animate();
        }, undefined, (error) => {
            console.error('Error loading model:', error);
            // Fallback would go here
        });

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enableZoom = true;
        this.controls.autoRotate = false;
        this.controls.maxPolarAngle = Math.PI / 1.5;
        this.controls.minPolarAngle = Math.PI / 3;

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        this.setupUI();
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.mask) {
            this.targetRotation.y = this.mouse.x * 0.2;
            this.targetRotation.x = -this.mouse.y * 0.2;
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
        
        let count = parseInt(localStorage.getItem('spidey_arsenal_count') || '0');
        countBadge.textContent = count;

        addBtn.addEventListener('click', () => {
            count++;
            localStorage.setItem('spidey_arsenal_count', count);
            countBadge.textContent = count;
            
            // Pulse animation
            addBtn.style.transform = 'scale(0.95)';
            setTimeout(() => addBtn.style.transform = 'scale(1.02)', 100);
            
            countBadge.style.transform = 'scale(1.5)';
            countBadge.style.background = '#fff';
            countBadge.style.color = '#dc1e30';
            
            setTimeout(() => {
                countBadge.style.transform = 'scale(1)';
                countBadge.style.background = '#dc1e30';
                countBadge.style.color = '#fff';
            }, 500);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.mask) {
            // Subtle floating
            this.mask.position.y = Math.sin(Date.now() * 0.001) * 0.1;
            
            // Mouse following
            this.mask.rotation.y += (this.targetRotation.y - this.mask.rotation.y) * 0.05;
            this.mask.rotation.x += (this.targetRotation.x - this.mask.rotation.x) * 0.05;
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
