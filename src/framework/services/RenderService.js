import { Service } from './Service.js';
import * as THREE from 'three';
import {
  createPBRRenderer,
  createLighting,
  applyAtmosphere,
  PBRMaterialFactory
} from '../../rendering/EnvironmentSetup.js';

export class RenderService extends Service {
    constructor(framework) {
        super('render', framework);
        this.renderer = null;
        this.scene = null;
        this.camera = null;
    }

    async initialize() {
        this.renderer = createPBRRenderer(document.body, window.innerWidth, window.innerHeight);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 2, 5);

        applyAtmosphere(this.scene);
        createLighting(this.scene);

        const materialFactory = new PBRMaterialFactory();
        
        // Procedural concrete floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = materialFactory.getMaterial('concrete', { roughness: 0.85, metalness: 0 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Procedural corridor metal wall
        const wallGeometry = new THREE.BoxGeometry(10, 4, 0.3);
        const wallMaterial = materialFactory.getMaterial('corridorMetal', { roughness: 0.4, metalness: 0.9, clearcoat: 0.15 });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(0, 2, -3);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    async start() {
        console.log('[RenderService] Started.');
    }

    update(delta) {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    async shutdown() {
        window.removeEventListener('resize', this.onWindowResize);
    }
}
