import * as THREE from 'https://esm.sh/three';
import { GLTFLoader } from 'https://esm.sh/three/examples/jsm/loaders/GLTFLoader.js';

// --- CONFIGURAÇÕES GERAIS ---
const START_POS_X = -40;
const END_POS_X = 40;
const MAX_SPEED = 0.8;

let carState = { currentSpeed: 0, isRacing: false };

// Variáveis para interação com o mouse
let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

// --- CENA E CÂMERA ---
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
// Fog mais avermelhado e profundo para dar clima
scene.fog = new THREE.FogExp2(0x100505, 0.025);

const initialZ = window.innerWidth < 768 ? 18 : 11;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = initialZ; camera.position.y = 2.5;

const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

// --- LUZES DRAMÁTICAS ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffd700, 4.5);
dirLight.position.set(-15, 20, 10);
scene.add(dirLight);

const rimLight = new THREE.PointLight(0xff1e1e, 0, 50);
rimLight.position.set(15, 3, -5);
scene.add(rimLight);

// --- FUNDO INTERATIVO TECH ---
let dataPoints, aiNodes = [];
const nodesGroup = new THREE.Group(); // Grupo para mover tudo junto com o mouse
scene.add(nodesGroup);

// 1. Matriz de Dados (Pontos de fundo)
function createDataMatrix() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let x = -60; x < 60; x += 4) {
        for (let z = -120; z < 60; z += 4) {
            // Adiciona um pouco de aleatoriedade à grid
            vertices.push(x + (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 15 - 5, z);
        }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    // Cor vermelha mais intensa e vibrante
    const material = new THREE.PointsMaterial({ color: 0xff3333, size: 0.18, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
    dataPoints = new THREE.Points(geometry, material);
    nodesGroup.add(dataPoints);
}

// 2. Nós de IA Flutuantes (Que fogem do mouse)
function createAINodes() {
    // Usa Icosaedro para visual "tech"
    const geometry = new THREE.IcosahedronGeometry(1.2, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0xff6b00, wireframe: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });

    for (let i = 0; i < 12; i++) { // Mais nós
        const node = new THREE.Mesh(geometry, material);
        // Espalha bem os nós
        node.position.set(
            (Math.random() - 0.5) * 80,
            Math.random() * 20 - 5,
            (Math.random() - 0.5) * 60 - 10
        );
        // Guarda posição original para retorno elástico
        node.userData = {
            originalPos: node.position.clone(),
            rotSpeed: Math.random() * 0.03 + 0.01,
            floatSpeed: Math.random() * 0.02 + 0.005
        };
        nodesGroup.add(node);
        aiNodes.push(node);
    }
}

createDataMatrix();
createAINodes();


// --- CARREGAR MCQUEEN ---
let mcqueenModel = null;
const loader = new GLTFLoader();
const CAR_SCALE = 2.2;

loader.load('assets/models/mcqueen.glb', (gltf) => {
    mcqueenModel = gltf.scene;
    mcqueenModel.scale.set(CAR_SCALE, CAR_SCALE, CAR_SCALE);
    mcqueenModel.position.set(START_POS_X, -3.8, 0);
    mcqueenModel.rotation.y = Math.PI / 2;

    // Tenta forçar um material mais metálico no modelo
    mcqueenModel.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.metalness = 0.9;
            child.material.roughness = 0.1;
        }
    });
    scene.add(mcqueenModel);
});


// --- INTERAÇÃO DOS MENUS (Mantida igual) ---
const menuCards = document.querySelectorAll('.menu-card');
const flashDiv = document.getElementById('lightning-flash');
const welcomeScreen = document.getElementById('welcome-screen');
const contentLayer = document.getElementById('content-layer');
const sections = document.querySelectorAll('.content-section');

menuCards.forEach(card => {
    card.addEventListener('click', (e) => {
        // Pega o card clicado (mesmo se clicar no ícone)
        const clickedCard = e.currentTarget;
        const targetId = clickedCard.getAttribute('data-target');

        // Ativa o giro
        clickedCard.classList.add('spinning');

        setTimeout(() => {
            flashDiv.classList.add('flash-active');
            setTimeout(() => flashDiv.classList.remove('flash-active'), 1200);

            if (mcqueenModel) {
                mcqueenModel.position.set(-35, -3.8, 0);
                carState.currentSpeed = 0;
                carState.isRacing = true;
                rimLight.intensity = 60;
            }

            setTimeout(() => {
                welcomeScreen.style.opacity = '0';
                welcomeScreen.style.pointerEvents = 'none';
                contentLayer.classList.add('visible');

                // Gerencia visibilidade das seções
                sections.forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(targetId);
                if (targetSection) targetSection.classList.add('active');

                clickedCard.classList.remove('spinning');
            }, 1200);
        }, 1200);
    });
});

document.getElementById('back-btn').addEventListener('click', () => {
    contentLayer.classList.remove('visible');
    setTimeout(() => {
        welcomeScreen.style.opacity = '1';
        welcomeScreen.style.pointerEvents = 'auto';
    }, 500);
    carState.isRacing = false;
    rimLight.intensity = 0;
    if (mcqueenModel) mcqueenModel.position.set(START_POS_X, -3.8, 0);
});


// --- LOOP DE ANIMAÇÃO PRINCIPAL ---
const clock = new THREE.Clock();
const mouseVector = new THREE.Vector3(); // Para cálculos de mouse

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = Date.now() * 0.001;

    // 1. Animação do Carro
    if (mcqueenModel && carState.isRacing) {
        carState.currentSpeed += (MAX_SPEED - carState.currentSpeed) * (2.5 * delta);
        mcqueenModel.position.x += carState.currentSpeed;
        mcqueenModel.position.z = Math.sin(mcqueenModel.position.x * 0.08) * 2.5;
        mcqueenModel.rotation.z = -Math.cos(mcqueenModel.position.x * 0.08) * 0.12;
        mcqueenModel.rotation.y = (Math.PI / 2) - (Math.cos(mcqueenModel.position.x * 0.08) * 0.15);
        rimLight.position.x = mcqueenModel.position.x + 5;

        if (mcqueenModel.position.x > END_POS_X) {
            carState.isRacing = false;
            rimLight.intensity = 0;
        }
    } else if (mcqueenModel) {
        mcqueenModel.position.y = -3.8 + Math.sin(time * 2) * 0.02;
    }

    // 2. INTERAÇÃO DO MOUSE COM O FUNDO (A grande novidade!)
    targetMouseX += (mouseX - targetMouseX) * 0.05;
    targetMouseY += (mouseY - targetMouseY) * 0.05;

    nodesGroup.rotation.y = targetMouseX * 0.0005;
    nodesGroup.rotation.x = targetMouseY * 0.0002;

    aiNodes.forEach(node => {
        node.rotation.x += node.userData.rotSpeed;
        node.rotation.y += node.userData.rotSpeed;
        node.position.y = node.userData.originalPos.y + Math.sin(time + node.position.x) * 0.5;

        mouseVector.set((targetMouseX / windowHalfX) * 30, -(targetMouseY / windowHalfY) * 20, 0);

        if (node.position.distanceTo(mouseVector) < 25) {
            const repulsion = node.position.clone().sub(mouseVector).normalize();
            node.position.add(repulsion.multiplyScalar((25 - node.position.distanceTo(mouseVector)) * 0.05));
        } else {
            node.position.x += (node.userData.originalPos.x - node.position.x) * 0.02;
            node.position.z += (node.userData.originalPos.z - node.position.z) * 0.02;
        }
    });

    if (dataPoints) {
        const positions = dataPoints.geometry.attributes.position.array;
        for (let i = 2; i < positions.length; i += 3) {
            positions[i] += 0.25;
            if (positions[i] > 30) positions[i] = -120;
        }
        dataPoints.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
}

animate();

// Responsividade
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = window.innerWidth < 768 ? 18 : 11;
});


// --- LÓGICA DE APARIÇÃO DA TIMELINE (ESSENCIAL) ---
// Isso faz os itens da jornada aparecerem quando rola a tela
const observerOptions = {
    threshold: 0.1 // Dispara quando 10% do item estiver visível
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Torna visível e traz para a posição original (subindo)
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target); // Para de observar depois que anima
        }
    });
}, observerOptions);

// Configura o estado inicial dos itens (invisíveis e deslocados para baixo)
document.querySelectorAll('.journey-item').forEach((item) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(50px)";
    observer.observe(item);
});

// ... (Código anterior do Three.js e Scroll Observer continua igual) ...

// --- EFEITO TILT HOLOGRÁFICO NOS CARDS ---
const tiltCards = document.querySelectorAll('[data-tilt]');

tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const content = card.querySelector('.journey-content');
        const rect = content.getBoundingClientRect();
        const x = e.clientX - rect.left; // Posição X do mouse dentro do card
        const y = e.clientY - rect.top;  // Posição Y do mouse dentro do card

        // Calcula a rotação baseada no centro do card
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Multiplicadores controlam a intensidade (divida por números maiores para suavizar)
        const rotateX = ((y - centerY) / 20) * -1; // Inverte para parecer que afunda onde toca
        const rotateY = (x - centerX) / 20;

        content.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

        // Efeito de brilho (Glare) dinâmico
        content.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.1), rgba(10,5,5,0.9))`;
        content.style.borderColor = 'var(--iron-red-bright)';
    });

    // Reseta quando o mouse sai
    card.addEventListener('mouseleave', () => {
        const content = card.querySelector('.journey-content');
        content.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        content.style.background = ''; // Volta ao padrão do CSS
        content.style.borderColor = '';
    });
});