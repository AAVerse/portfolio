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
  Line,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

type MaterialName = 'primary' | 'surface' | 'text';
type ThreeModule = typeof import('three');
type VectorTuple = [number, number, number];

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
  private readonly materials = new Map<MaterialName, LineBasicMaterial>();
  private readonly geometries: BufferGeometry[] = [];

  private animationFrameId = 0;
  private camera?: PerspectiveCamera;
  private isDestroyed = false;
  private pcGroup?: Group;
  private renderer?: WebGLRenderer;
  private resizeObserver?: ResizeObserver;
  private scene?: Scene;
  private targetRotationY = -0.18;
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
      new THREE.LineBasicMaterial({ color: colors.primary, transparent: true, opacity: 0.98 }),
    );
    this.materials.set(
      'surface',
      new THREE.LineBasicMaterial({ color: colors.surface, transparent: true, opacity: 0.82 }),
    );
    this.materials.set(
      'text',
      new THREE.LineBasicMaterial({ color: colors.text, transparent: true, opacity: 0.9 }),
    );
  }

  private createPcOutline(): Group {
    const THREE = this.threeModule;
    const group = new THREE.Group();
    group.position.set(-0.15, 0.1, 0);
    group.rotation.x = -0.08;
    group.scale.setScalar(0.86);

    group.add(this.createBoxOutline(4.65, 2.8, 0.2, 'primary', [0, 0.58, 0]));
    group.add(this.createRectangle(4.05, 2.18, 'text', [0, 0.58, 0.13]));
    group.add(this.createLine([[-1.7, 1.15, 0.15], [1.7, 1.15, 0.15]], 'surface'));
    group.add(this.createLine([[-1.7, 0.82, 0.15], [1.7, 0.82, 0.15]], 'surface'));
    group.add(this.createLine([[-1.7, 0.49, 0.15], [1.7, 0.49, 0.15]], 'surface'));

    group.add(this.createBoxOutline(0.36, 0.7, 0.22, 'primary', [0, -1.28, 0.02]));
    group.add(this.createBoxOutline(1.55, 0.22, 0.92, 'primary', [0, -1.76, 0.42]));
    group.add(this.createBoxOutline(3.85, 0.24, 1.02, 'text', [0, -2.12, 0.82]));
    group.add(this.createLine([[-1.55, -1.99, 0.62], [1.55, -1.99, 0.62]], 'surface'));
    group.add(this.createLine([[-1.72, -1.99, 0.85], [1.72, -1.99, 0.85]], 'surface'));
    group.add(this.createLine([[-1.45, -1.99, 1.08], [1.45, -1.99, 1.08]], 'surface'));

    group.add(this.createBoxOutline(1.25, 2.9, 0.7, 'primary', [3.15, 0.36, -0.18]));
    group.add(this.createRectangle(0.82, 2.32, 'surface', [3.15, 0.36, 0.2]));
    group.add(this.createEllipse(0.12, 0.12, 'text', [2.94, 1.32, 0.22]));
    group.add(this.createLine([[2.82, 0.82, 0.23], [3.48, 0.82, 0.23]], 'surface'));
    group.add(this.createLine([[2.82, 0.54, 0.23], [3.48, 0.54, 0.23]], 'surface'));
    group.add(this.createLine([[2.82, 0.26, 0.23], [3.48, 0.26, 0.23]], 'surface'));
    group.add(this.createLine([[2.82, -0.02, 0.23], [3.48, -0.02, 0.23]], 'surface'));

    group.add(this.createFlatEllipse(0.46, 0.24, 'text', [2.78, -2.12, 0.93]));
    group.add(this.createLine([[2.78, -2.12, 0.72], [2.78, -2.12, 1.12]], 'surface'));

    return group;
  }

  private createBoxOutline(
    width: number,
    height: number,
    depth: number,
    materialName: MaterialName,
    position: VectorTuple,
  ): LineSegments {
    const THREE = this.threeModule;
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    const edgeGeometry = new THREE.EdgesGeometry(boxGeometry);
    boxGeometry.dispose();

    const outline = new THREE.LineSegments(edgeGeometry, this.getMaterial(materialName));
    outline.position.set(...position);
    this.geometries.push(edgeGeometry);

    return outline;
  }

  private createRectangle(
    width: number,
    height: number,
    materialName: MaterialName,
    position: VectorTuple,
  ): Line {
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

  private createEllipse(
    radiusX: number,
    radiusY: number,
    materialName: MaterialName,
    position: VectorTuple,
  ): Line {
    const THREE = this.threeModule;
    const points = this.createEllipsePoints(radiusX, radiusY).map(
      ([x, y]) => new THREE.Vector3(x, y, 0),
    );

    return this.createLineFromPoints(points, materialName, position);
  }

  private createFlatEllipse(
    radiusX: number,
    radiusZ: number,
    materialName: MaterialName,
    position: VectorTuple,
  ): Line {
    const THREE = this.threeModule;
    const points = this.createEllipsePoints(radiusX, radiusZ).map(
      ([x, z]) => new THREE.Vector3(x, 0, z),
    );

    return this.createLineFromPoints(points, materialName, position);
  }

  private createEllipsePoints(radiusX: number, radiusY: number): [number, number][] {
    return Array.from({ length: 65 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 64;

      return [Math.cos(angle) * radiusX, Math.sin(angle) * radiusY];
    });
  }

  private createLine(points: [VectorTuple, VectorTuple], materialName: MaterialName): Line {
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
  ): Line {
    const THREE = this.threeModule;
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, this.getMaterial(materialName));
    line.position.set(...position);
    this.geometries.push(geometry);

    return line;
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
    this.targetRotationY = -0.18 + progress * (Math.PI / 2);

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
    this.camera.position.z = compact ? 12.2 : 9.8;
    this.pcGroup.position.set(compact ? -0.2 : -0.15, compact ? 0.05 : 0.1, 0);
    this.pcGroup.scale.setScalar(compact ? 0.78 : 0.86);
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

  private get threeModule(): ThreeModule {
    if (!this.three) {
      throw new Error('Three.js has not loaded.');
    }

    return this.three;
  }
}
