import * as THREE from 'https://esm.sh/three';
import { GLTFLoader } from 'https://esm.sh/three/examples/jsm/loaders/GLTFLoader.js';

// --- CONFIGURAÇÕES DO "PASSEIO CINEMATOGRÁFICO" ---
const START_POS_X = -40; // Começa mais longe
const END_POS_X = 40;
const MAX_SPEED = 0.6;   // Velocidade máxima do cruzeiro

let carState = {
    currentSpeed: 0, // Velocidade atual (será interpolada)
    isRacing: false,
};

// SETUP DE CENA E CÂMERA RESPONSIVA
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
// Fog mais escuro e denso para focar no carro
scene.fog = new THREE.FogExp2(0x050505, 0.035);

const initialZ = window.innerWidth < 768 ? 18 : 10; // Câmera um pouco mais longe no PC também
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = initialZ;
camera.position.y = 2.5; // Câmera ligeiramente mais alta

const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Otimização essencial para suavidade (evita renderizar pixels demais em telas 4k/retina)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

// --- LUZES DRAMÁTICAS ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Luz principal (Sol Dourado)
const dirLight = new THREE.DirectionalLight(0xffd700, 3.5);
dirLight.position.set(-15, 10, 5);
scene.add(dirLight);

// Luz de Aro Traseira (Vermelho Neon - Vai mudar dinamicamente)
const rimLight = new THREE.PointLight(0xff0000, 0, 30); // Começa apagada (intensidade 0)
rimLight.position.set(15, 3, -5);
scene.add(rimLight);


// --- PARTÍCULAS DE AMBIENTE (Mais sutis) ---
let particles;
function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 500; i++) {
        vertices.push(
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    // Partículas menores e mais escuras para não distrair
    const material = new THREE.PointsMaterial({ color: 0x333333, size: 0.08 });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}
createParticles();


// --- CARREGAR MCQUEEN ---
let mcqueenModel = null;
const loader = new GLTFLoader();
// Aumentei a escala para 2.1 para ficar mais imponente
const CAR_SCALE = 2.1;

loader.load('assets/models/mcqueen.glb', (gltf) => {
    mcqueenModel = gltf.scene;
    mcqueenModel.scale.set(CAR_SCALE, CAR_SCALE, CAR_SCALE);
    // Posição inicial escondida
    mcqueenModel.position.set(START_POS_X, -3.8, 0);
    mcqueenModel.rotation.y = Math.PI / 2;

    // Otimização de sombras (se o modelo suportar)
    mcqueenModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(mcqueenModel);
});


// --- NAVEGAÇÃO (Mantida igual) ---
const menuCards = document.querySelectorAll('.menu-card');
const flashDiv = document.getElementById('lightning-flash');
const welcomeScreen = document.getElementById('welcome-screen');
const contentLayer = document.getElementById('content-layer');
const sections = document.querySelectorAll('.content-section');

menuCards.forEach(card => {
    card.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');

        flashDiv.classList.add('flash-active');
        setTimeout(() => flashDiv.classList.remove('flash-active'), 800);

        if (mcqueenModel) {
            // Reseta posição para o início
            mcqueenModel.position.set(-35, -3.8, 0);
            carState.currentSpeed = 0; // Reseta velocidade
            carState.isRacing = true;

            // Acende a luz traseira dramaticamente
            rimLight.intensity = 8;
        }

        setTimeout(() => {
            welcomeScreen.style.opacity = '0';
            welcomeScreen.style.pointerEvents = 'none';
            contentLayer.classList.add('visible');
            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
        }, 2200); // Tempo ajustado para o novo ritmo
    });
});

document.getElementById('back-btn').addEventListener('click', () => {
    contentLayer.classList.remove('visible');
    setTimeout(() => {
        welcomeScreen.style.opacity = '1';
        welcomeScreen.style.pointerEvents = 'auto';
    }, 500);

    // Para o carro e apaga a luz extra
    carState.isRacing = false;
    rimLight.intensity = 0;
    if (mcqueenModel) mcqueenModel.position.set(START_POS_X, -3.8, 0);
});


// --- LOOP DE ANIMAÇÃO (FÍSICA SUAVE) ---
// Usamos um relógio para garantir suavidade independente do FPS do monitor
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); // Tempo entre frames (para suavidade)

    if (mcqueenModel && carState.isRacing) {
        // --- 1. ACELERAÇÃO LERP (FÍSICA SUAVE) ---
        // A velocidade atual tenta alcançar a MAX_SPEED suavemente.
        // O valor '1.5 * delta' define quão rápido ele acelera.
        carState.currentSpeed += (MAX_SPEED - carState.currentSpeed) * (1.5 * delta);

        // Move o carro
        mcqueenModel.position.x += carState.currentSpeed;

        // --- 2. CURVAS E INCLINAÇÃO (SEM TREMOR) ---
        // Removemos a vibração em Y. O foco agora é apenas a curva limpa.

        // Curva "S" suave no eixo Z
        mcqueenModel.position.z = Math.sin(mcqueenModel.position.x * 0.08) * 2.5;

        // Inclinação do Chassi (Body Roll) oposta à curva - FÍSICA REALISTA
        mcqueenModel.rotation.z = -Math.cos(mcqueenModel.position.x * 0.08) * 0.12;

        // Aponta o nariz para a direção da curva
        mcqueenModel.rotation.y = (Math.PI / 2) - (Math.cos(mcqueenModel.position.x * 0.08) * 0.15);

        // --- 3. EFEITOS DINÂMICOS ---
        // A luz traseira pisca ligeiramente com a velocidade
        rimLight.intensity = 8 + Math.sin(Date.now() * 0.01) * 2;
        // Move a luz junto com o carro no eixo X
        rimLight.position.x = mcqueenModel.position.x + 5;


        // Reset ao sair da tela
        if (mcqueenModel.position.x > END_POS_X) {
            carState.isRacing = false;
            rimLight.intensity = 0; // Apaga luz
        }
    }
    else if (mcqueenModel && !carState.isRacing) {
        // IDLE STATE (Parado)
        // Apenas aqui usamos a vibração vertical suave
        mcqueenModel.position.y = -3.8 + Math.sin(Date.now() * 0.03) * 0.015;
        rimLight.intensity = 0;
    }

    // Partículas de fundo lentas
    if (particles) particles.rotation.y += 0.0002;

    renderer.render(scene, camera);
}

animate();

// --- RESPONSIVIDADE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Ajuste dinâmico da câmera
    camera.position.z = window.innerWidth < 768 ? 18 : 10;
});