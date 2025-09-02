// components/GalleryCanvas.jsx
"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

import { vertexShader, fragmentShader } from "@/shaders";
import { projects } from "@/data/projects";

const config = {
  cellSize: 0.75,
  zoomLevel: 1.25,
  lerpFactor: 0.075,
  borderColor: "rgba(255, 255, 255, 0.15)",
  backgroundColor: "rgba(0, 0, 0, 1)",
  textColor: "rgba(128, 128, 128, 1)",
  hoverColor: "rgba(255, 255, 255, 0)",
};

function rgbaToArray(rgba) {
  const match = rgba.match(/rgba?\(([^)]+)\)/);
  if (!match) return [1, 1, 1, 1];
  return match[1]
    .split(",")
    .map((v, i) =>
      i < 3 ? parseFloat(v.trim()) / 255 : parseFloat(v.trim() || 1)
    );
}

export default function GalleryCanvas() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const stateRef = useRef({
    scene: null,
    camera: null,
    plane: null,
    isDragging: false,
    isClick: true,
    clickStartTime: 0,
    previousMouse: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    targetOffset: { x: 0, y: 0 },
    mousePosition: { x: -1, y: -1 },
    zoomLevel: 1.0,
    targetZoom: 1.0,
    textTextures: [],
  });

  // create text canvas texture
  function createTextTexture(title, year) {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "80px IBM Plex Mono, monospace";
    ctx.fillStyle = config.textColor;
    ctx.textBaseline = "middle";
    ctx.imageSmoothingEnabled = false;

    ctx.textAlign = "left";
    ctx.fillText(title.toUpperCase(), 30, 128);
    ctx.textAlign = "right";
    ctx.fillText(year.toString().toUpperCase(), 2048 - 30, 128);

    const texture = new THREE.CanvasTexture(canvas);
    Object.assign(texture, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      flipY: false,
      generateMipmaps: false,
      format: THREE.RGBAFormat,
    });

    return texture;
  }

  function createTextureAtlas(textures, isText = false) {
    const atlasSize = Math.ceil(Math.sqrt(textures.length));
    const textureSize = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = atlasSize * textureSize;
    const ctx = canvas.getContext("2d");

    if (isText) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    textures.forEach((texture, index) => {
      const x = (index % atlasSize) * textureSize;
      const y = Math.floor(index / atlasSize) * textureSize;

      if (isText && texture.source?.data) {
        ctx.drawImage(texture.source.data, x, y, textureSize, textureSize);
      } else if (!isText && texture.image?.complete) {
        ctx.drawImage(texture.image, x, y, textureSize, textureSize);
      }
    });

    const atlasTexture = new THREE.CanvasTexture(canvas);
    Object.assign(atlasTexture, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      flipY: false,
    });

    return atlasTexture;
  }

  function loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const imageTextures = [];
    let loadedCount = 0;

    return new Promise((resolve) => {
      projects.forEach((project) => {
        const texture = textureLoader.load(project.image, () => {
          if (++loadedCount === projects.length) resolve(imageTextures);
        });

        Object.assign(texture, {
          wrapS: THREE.ClampToEdgeWrapping,
          wrapT: THREE.ClampToEdgeWrapping,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
        });

        imageTextures.push(texture);
        stateRef.current.textTextures.push(
          createTextTexture(project.title, project.year)
        );
      });
    });
  }

  // pointer and touch helpers
  function updateMousePosition(event, renderer) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mp = stateRef.current.mousePosition;
    mp.x = event.clientX - rect.left;
    mp.y = event.clientY - rect.top;
    const plane = stateRef.current.plane;
    if (plane?.material?.uniforms?.uMousePos) {
      plane.material.uniforms.uMousePos.value.set(mp.x, mp.y);
    }
  }

  function startDrag(x, y) {
    const s = stateRef.current;
    s.isDragging = true;
    s.isClick = true;
    s.clickStartTime = Date.now();
    document.body.classList.add("dragging");
    s.previousMouse.x = x;
    s.previousMouse.y = y;
    setTimeout(() => s.isDragging && (s.targetZoom = config.zoomLevel), 150);
  }

  function handleMove(currentX, currentY) {
    const s = stateRef.current;
    if (!s.isDragging || currentX === undefined || currentY === undefined)
      return;

    const deltaX = currentX - s.previousMouse.x;
    const deltaY = currentY - s.previousMouse.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      s.isClick = false;
      if (s.targetZoom === 1.0) s.targetZoom = config.zoomLevel;
    }

    s.targetOffset.x -= deltaX * 0.003;
    s.targetOffset.y += deltaY * 0.003;
    s.previousMouse.x = currentX;
    s.previousMouse.y = currentY;
  }

  function onPointerUp(event, renderer) {
    const s = stateRef.current;
    s.isDragging = false;
    document.body.classList.remove("dragging");
    s.targetZoom = 1.0;

    if (s.isClick && Date.now() - s.clickStartTime < 200) {
      const endX = event.clientX || event.changedTouches?.[0]?.clientX;
      const endY = event.clientY || event.changedTouches?.[0]?.clientY;

      if (endX !== undefined && endY !== undefined) {
        const rect = renderer.domElement.getBoundingClientRect();
        const screenX = ((endX - rect.left) / rect.width) * 2 - 1;
        const screenY = -(((endY - rect.top) / rect.height) * 2 - 1);

        const radius = Math.sqrt(screenX * screenX + screenY * screenY);
        const distortion = 1.0 - 0.08 * radius * radius;

        let worldX =
          screenX * distortion * (rect.width / rect.height) * s.zoomLevel +
          s.offset.x;
        let worldY = screenY * distortion * s.zoomLevel + s.offset.y;

        const cellX = Math.floor(worldX / config.cellSize);
        const cellY = Math.floor(worldY / config.cellSize);
        let texIndex = Math.floor((cellX + cellY * 3.0) % projects.length);
        const actualIndex =
          texIndex < 0 ? projects.length + texIndex : texIndex;

        if (projects[actualIndex]?.href) {
          window.location.href = projects[actualIndex].href;
        }
      }
    }
  }

  function resizeRendererToDisplaySize(renderer, camera) {
    const container = containerRef.current;
    if (!container) return;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    const plane = stateRef.current.plane;
    if (plane?.material?.uniforms?.uResolution) {
      plane.material.uniforms.uResolution.value.set(width, height);
    }
  }

  useEffect(() => {
    let mounted = true;
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    stateRef.current.scene = scene;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    stateRef.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const bgColor = rgbaToArray(config.backgroundColor);
    renderer.setClearColor(
      new THREE.Color(bgColor[0], bgColor[1], bgColor[2]),
      bgColor[3]
    );

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    let rafId = null;

    (async function init() {
      const imageTextures = await loadTextures();
      if (!mounted) return;

      const imageAtlas = createTextureAtlas(imageTextures, false);
      const textAtlas = createTextureAtlas(stateRef.current.textTextures, true);

      const uniforms = {
        uOffset: { value: new THREE.Vector2(0, 0) },
        uResolution: {
          value: new THREE.Vector2(
            container.offsetWidth,
            container.offsetHeight
          ),
        },
        uBorderColor: {
          value: new THREE.Vector4(...rgbaToArray(config.borderColor)),
        },
        uHoverColor: {
          value: new THREE.Vector4(...rgbaToArray(config.hoverColor)),
        },
        uBackgroundColor: {
          value: new THREE.Vector4(...rgbaToArray(config.backgroundColor)),
        },
        uMousePos: { value: new THREE.Vector2(-1, -1) },
        uZoom: { value: 1.0 },
        uCellSize: { value: config.cellSize },
        uTextureCount: { value: projects.length },
        uImageAtlas: { value: imageAtlas },
        uTextAtlas: { value: textAtlas },
      };

      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
      });

      const plane = new THREE.Mesh(geometry, material);
      scene.add(plane);
      stateRef.current.plane = plane;

      // event handlers
      const onPointerDown = (e) => startDrag(e.clientX, e.clientY);
      const onPointerMove = (e) => handleMove(e.clientX, e.clientY);
      const onTouchStart = (e) => {
        e.preventDefault();
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      };
      const onTouchMove = (e) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      };
      const onMouseMoveCanvas = (e) => updateMousePosition(e, renderer);
      const onMouseLeaveCanvas = () => {
        stateRef.current.mousePosition.x = stateRef.current.mousePosition.y =
          -1;
        plane.material.uniforms.uMousePos.value.set(-1, -1);
      };

      // wiring
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("mousemove", onPointerMove);
      document.addEventListener("mouseup", (e) => onPointerUp(e, renderer));
      document.addEventListener("mouseleave", (e) => onPointerUp(e, renderer));

      const passiveOpts = { passive: false };
      document.addEventListener("touchstart", onTouchStart, passiveOpts);
      document.addEventListener("touchmove", onTouchMove, passiveOpts);
      document.addEventListener(
        "touchend",
        (e) => onPointerUp(e, renderer),
        passiveOpts
      );

      window.addEventListener("resize", () =>
        resizeRendererToDisplaySize(renderer, camera)
      );
      document.addEventListener("contextmenu", (e) => e.preventDefault());

      renderer.domElement.addEventListener("mousemove", onMouseMoveCanvas);
      renderer.domElement.addEventListener("mouseleave", onMouseLeaveCanvas);

      // animate
      function animate() {
        const s = stateRef.current;
        rafId = requestAnimationFrame(animate);

        s.offset.x += (s.targetOffset.x - s.offset.x) * config.lerpFactor;
        s.offset.y += (s.targetOffset.y - s.offset.y) * config.lerpFactor;
        s.zoomLevel += (s.targetZoom - s.zoomLevel) * config.lerpFactor;

        if (s.plane?.material?.uniforms) {
          s.plane.material.uniforms.uOffset.value.set(s.offset.x, s.offset.y);
          s.plane.material.uniforms.uZoom.value = s.zoomLevel;
        }

        renderer.render(scene, camera);
      }

      animate();
    })();

    // cleanup
    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.domElement.remove();
        renderer.dispose();
      }
      // Remove listeners
      document.removeEventListener("mousedown", startDrag);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", onPointerUp);
      document.removeEventListener("mouseleave", onPointerUp);
      window.removeEventListener("resize", resizeRendererToDisplaySize);
      document.removeEventListener("contextmenu", (e) => e.preventDefault());
    };
  }, []); // run once

  return (
    <div
      id="gallery"
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
