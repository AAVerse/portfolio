import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import type {
  BufferGeometry,
  Group,
  LineBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

type MaterialName = 'primary' | 'surface' | 'text';
type ThreeModule = typeof import('three');
type VectorTuple = [number, number, number];

const CLOSED_LID_ROTATION = Math.PI / 2;
const OPEN_LID_ROTATION = -0.16;

@Component({
  selector: 'app-pc-outline-scene',
  imports: [],
  templateUrl: './pc-outline-scene.html',
  styleUrl: './pc-outline-scene.scss',
})
export class PcOutlineScene implements AfterViewInit, OnChanges, OnDestroy {
  @Input() darkTheme = false;
  @Input() scrollProgress = 0;
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly boldOffsets: VectorTuple[] = [
    [0, 0, 0],
    [0.018, 0, 0],
    [-0.018, 0, 0],
    [0, 0.018, 0],
    [0, -0.018, 0],
  ];
  private readonly materials = new Map<MaterialName, LineBasicMaterial>();
  private readonly geometries: BufferGeometry[] = [];

  private animationFrameId = 0;
  private camera?: PerspectiveCamera;
  private isDestroyed = false;
  private lidGroup?: Group;
  private pcGroup?: Group;
  private renderer?: WebGLRenderer;
  private resizeObserver?: ResizeObserver;
  private scene?: Scene;
  private targetRotationY = -0.18;
  private targetLidRotationX = CLOSED_LID_ROTATION;
  private three?: ThreeModule;
  private reducedMotion = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      void this.initializeScene();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scrollProgress']) {
      this.updateTargetRotation();
    }

    if (changes['darkTheme'] && this.renderer) {
      window.requestAnimationFrame(() => this.refreshMaterialColors());
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;

    if (isPlatformBrowser(this.platformId)) {
      window.cancelAnimationFrame(this.animationFrameId);
    }

    this.resizeObserver?.disconnect();
    this.renderer?.dispose();

    for (const geometry of this.geometries) {
      geometry.dispose();
    }

    for (const material of this.materials.values()) {
      material.dispose();
    }
  }

  private async initializeScene(): Promise<void> {
    this.three = await import('three');

    if (this.isDestroyed) {
      return;
    }

    const THREE = this.threeModule;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.camera.position.set(0, 0.1, 9.8);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: this.canvasRef.nativeElement,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.createMaterials();

    this.pcGroup = this.createPcOutline();
    this.scene.add(this.pcGroup);

    this.resizeObserver = new ResizeObserver(() => this.resizeScene());
    this.resizeObserver.observe(this.canvasRef.nativeElement);
    this.resizeScene();
    this.updateTargetRotation();
    this.refreshMaterialColors();

    if (this.reducedMotion) {
      this.applyRotation(1);
      this.renderScene();
      return;
    }

    this.animateScene();
  }

  private createMaterials(): void {
    const THREE = this.threeModule;
    const colors = this.readThemeColors();

    this.materials.set(
      'primary',
      new THREE.LineBasicMaterial({
        color: colors.primary,
        linewidth: 2,
        transparent: true,
        opacity: 0.98,
      }),
    );
    this.materials.set(
      'surface',
      new THREE.LineBasicMaterial({
        color: colors.surface,
        linewidth: 2,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.materials.set(
      'text',
      new THREE.LineBasicMaterial({
        color: colors.text,
        linewidth: 2,
        transparent: true,
        opacity: 0.95,
      }),
    );
  }

  private createPcOutline(): Group {
    const THREE = this.threeModule;
    const group = new THREE.Group();
    group.position.set(-0.15, -0.05, 0);
    group.rotation.x = -0.12;
    group.scale.setScalar(0.9);

    group.add(this.createBoxOutline(5.55, 0.24, 3.12, 'primary', [0, -1.28, 0.42]));
    group.add(this.createHorizontalRectangle(5.1, 2.62, 'text', [0, -1.12, 0.44]));
    group.add(this.createHorizontalRectangle(1.45, 0.82, 'surface', [0, -1.08, 1.08]));
    group.add(this.createLine([[-2.05, -1.08, -0.38], [2.05, -1.08, -0.38]], 'surface'));
    group.add(this.createLine([[-2.05, -1.08, -0.1], [2.05, -1.08, -0.1]], 'surface'));
    group.add(this.createLine([[-2.05, -1.08, 0.18], [2.05, -1.08, 0.18]], 'surface'));
    group.add(this.createLine([[-2.35, -1.08, -1.13], [2.35, -1.08, -1.13]], 'primary'));

    this.lidGroup = new THREE.Group();
    this.lidGroup.position.set(0, -1.14, -1.13);
    this.lidGroup.rotation.x = CLOSED_LID_ROTATION;
    this.lidGroup.add(this.createBoxOutline(5.4, 3.25, 0.2, 'primary', [0, 1.62, -0.02]));
    this.lidGroup.add(this.createRectangle(4.72, 2.45, 'text', [0, 1.62, 0.1]));
    this.lidGroup.add(this.createEllipse(0.09, 0.09, 'surface', [0, 2.92, 0.11]));
    this.lidGroup.add(this.createLine([[-1.75, 2.22, 0.12], [1.75, 2.22, 0.12]], 'surface'));
    this.lidGroup.add(this.createLine([[-1.75, 1.88, 0.12], [1.75, 1.88, 0.12]], 'surface'));
    this.lidGroup.add(this.createLine([[-1.75, 1.54, 0.12], [1.75, 1.54, 0.12]], 'surface'));
    this.lidGroup.add(this.createLine([[-1.75, 1.2, 0.12], [1.75, 1.2, 0.12]], 'surface'));
    this.lidGroup.add(this.createLine([[-2.45, 0, 0.02], [2.45, 0, 0.02]], 'primary'));
    group.add(this.lidGroup);

    return group;
  }

  private createBoxOutline(
    width: number,
    height: number,
    depth: number,
    materialName: MaterialName,
    position: VectorTuple,
  ): Group {
    const THREE = this.threeModule;
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    const edgeGeometry = new THREE.EdgesGeometry(boxGeometry);
    boxGeometry.dispose();
    this.geometries.push(edgeGeometry);

    const group = new THREE.Group();

    for (const offset of this.boldOffsets) {
      const outline = new THREE.LineSegments(edgeGeometry, this.getMaterial(materialName));
      outline.position.set(
        position[0] + offset[0],
        position[1] + offset[1],
        position[2] + offset[2],
      );
      group.add(outline);
    }

    return group;
  }

  private createRectangle(
    width: number,
    height: number,
    materialName: MaterialName,
    position: VectorTuple,
  ): Group {
    const THREE = this.threeModule;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const points = [
      new THREE.Vector3(-halfWidth, -halfHeight, 0),
      new THREE.Vector3(halfWidth, -halfHeight, 0),
      new THREE.Vector3(halfWidth, halfHeight, 0),
      new THREE.Vector3(-halfWidth, halfHeight, 0),
      new THREE.Vector3(-halfWidth, -halfHeight, 0),
    ];

    return this.createLineFromPoints(points, materialName, position);
  }

  private createHorizontalRectangle(
    width: number,
    depth: number,
    materialName: MaterialName,
    position: VectorTuple,
  ): Group {
    const THREE = this.threeModule;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const points = [
      new THREE.Vector3(-halfWidth, 0, -halfDepth),
      new THREE.Vector3(halfWidth, 0, -halfDepth),
      new THREE.Vector3(halfWidth, 0, halfDepth),
      new THREE.Vector3(-halfWidth, 0, halfDepth),
      new THREE.Vector3(-halfWidth, 0, -halfDepth),
    ];

    return this.createLineFromPoints(points, materialName, position);
  }

  private createEllipse(
    radiusX: number,
    radiusY: number,
    materialName: MaterialName,
    position: VectorTuple,
  ): Group {
    const THREE = this.threeModule;
    const points = this.createEllipsePoints(radiusX, radiusY).map(
      ([x, y]) => new THREE.Vector3(x, y, 0),
    );

    return this.createLineFromPoints(points, materialName, position);
  }

  private createEllipsePoints(radiusX: number, radiusY: number): [number, number][] {
    return Array.from({ length: 65 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 64;

      return [Math.cos(angle) * radiusX, Math.sin(angle) * radiusY];
    });
  }

  private createLine(points: [VectorTuple, VectorTuple], materialName: MaterialName): Group {
    const THREE = this.threeModule;

    return this.createLineFromPoints(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      materialName,
      [0, 0, 0],
    );
  }

  private createLineFromPoints(
    points: Vector3[],
    materialName: MaterialName,
    position: VectorTuple,
  ): Group {
    const THREE = this.threeModule;
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.geometries.push(geometry);

    const group = new THREE.Group();

    for (const offset of this.boldOffsets) {
      const line = new THREE.Line(geometry, this.getMaterial(materialName));
      line.position.set(
        position[0] + offset[0],
        position[1] + offset[1],
        position[2] + offset[2],
      );
      group.add(line);
    }

    return group;
  }

  private getMaterial(materialName: MaterialName): LineBasicMaterial {
    const material = this.materials.get(materialName);

    if (!material) {
      throw new Error(`Missing ${materialName} material.`);
    }

    return material;
  }

  private updateTargetRotation(): void {
    const progress = Math.max(0, this.scrollProgress);
    const openProgress = this.smoothstep(Math.min(progress, 1));
    const rotationProgress = Math.max(progress - 1, 0);

    this.targetLidRotationX = this.lerp(CLOSED_LID_ROTATION, OPEN_LID_ROTATION, openProgress);
    this.targetRotationY = -0.18 + rotationProgress * (Math.PI / 2);

    if (this.reducedMotion) {
      this.applyRotation(1);
      this.renderScene();
    }
  }

  private animateScene = (): void => {
    this.applyRotation(0.1);
    this.renderScene();
    this.animationFrameId = window.requestAnimationFrame(this.animateScene);
  };

  private applyRotation(amount: number): void {
    if (!this.pcGroup) {
      return;
    }

    this.pcGroup.rotation.y = this.threeModule.MathUtils.lerp(
      this.pcGroup.rotation.y,
      this.targetRotationY,
      amount,
    );

    if (this.lidGroup) {
      this.lidGroup.rotation.x = this.threeModule.MathUtils.lerp(
        this.lidGroup.rotation.x,
        this.targetLidRotationX,
        amount,
      );
    }
  }

  private resizeScene(): void {
    if (!this.camera || !this.renderer) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);

    this.camera.aspect = width / height;
    this.updateResponsiveFraming(width);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderScene();
  }

  private updateResponsiveFraming(width: number): void {
    if (!this.camera || !this.pcGroup) {
      return;
    }

    const compact = width < 520;
    this.camera.position.z = compact ? 11.7 : 9.6;
    this.pcGroup.position.set(compact ? -0.1 : -0.15, compact ? -0.08 : -0.05, 0);
    this.pcGroup.scale.setScalar(compact ? 0.75 : 0.9);
  }

  private renderScene(): void {
    if (!this.camera || !this.renderer || !this.scene) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private refreshMaterialColors(): void {
    const colors = this.readThemeColors();
    this.materials.get('primary')?.color.setHex(colors.primary);
    this.materials.get('surface')?.color.setHex(colors.surface);
    this.materials.get('text')?.color.setHex(colors.text);
    this.renderScene();
  }

  private readThemeColors(): Record<MaterialName, number> {
    const styles = window.getComputedStyle(this.hostRef.nativeElement);

    return {
      primary: this.parseCssColor(styles.getPropertyValue('--color-primary'), 0x810b38),
      surface: this.parseCssColor(styles.getPropertyValue('--color-surface'), 0xdcc3aa),
      text: this.parseCssColor(styles.getPropertyValue('--color-text'), 0x541a1a),
    };
  }

  private parseCssColor(value: string, fallback: number): number {
    const THREE = this.threeModule;
    const color = new THREE.Color();

    try {
      color.setStyle(value.trim());

      return color.getHex();
    } catch {
      return fallback;
    }
  }

  private lerp(start: number, end: number, amount: number): number {
    return start + (end - start) * amount;
  }

  private smoothstep(value: number): number {
    const clamped = Math.min(Math.max(value, 0), 1);

    return clamped * clamped * (3 - 2 * clamped);
  }

  private get threeModule(): ThreeModule {
    if (!this.three) {
      throw new Error('Three.js has not loaded.');
    }

    return this.three;
  }
}
