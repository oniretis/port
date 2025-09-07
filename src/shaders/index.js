// shaders/index.js
export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  uniform vec2 uOffset;
  uniform vec2 uResolution;
  uniform vec4 uBorderColor;
  uniform vec4 uHoverColor;
  uniform vec4 uBackgroundColor;
  uniform vec2 uMousePos;
  uniform float uZoom;
  uniform float uCellSize;
  uniform float uTextureCount;
  uniform sampler2D uImageAtlas;
  uniform sampler2D uTextAtlas;
  uniform float uBackgroundBlur; // NEW
  uniform vec4 uOverlayColor; // NEW
  varying vec2 vUv;

  // Simple 9-tap box blur around a base UV
  vec3 blurSample(sampler2D tex, vec2 baseUV, float radius) {
    vec3 acc = vec3(0.0);
    float count = 0.0;

    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 o = vec2(float(x), float(y)) * radius;
        acc += texture2D(tex, baseUV + o).rgb;
        count += 1.0;
      }
    }
    return acc / max(count, 1.0);
  }

  void main() {
    vec2 screenUV = (vUv - 0.5) * 2.0;

    // Lens distortion for scene coords
    float radius = length(screenUV);
    float distortion = 1.0 - 0.08 * radius * radius;
    vec2 distortedUV = screenUV * distortion;

    vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 worldCoord = distortedUV * aspectRatio;

    worldCoord *= uZoom;
    worldCoord += uOffset;

    vec2 cellPos = worldCoord / uCellSize;
    vec2 cellId = floor(cellPos);
    vec2 cellUV = fract(cellPos);

    // Mouse to world/cell (unchanged)
    vec2 mouseScreenUV = (uMousePos / uResolution) * 2.0 - 1.0;
    mouseScreenUV.y = -mouseScreenUV.y;

    float mouseRadius = length(mouseScreenUV);
    float mouseDistortion = 1.0 - 0.08 * mouseRadius * mouseRadius;
    vec2 mouseDistortedUV = mouseScreenUV * mouseDistortion;
    vec2 mouseWorldCoord = mouseDistortedUV * aspectRatio;

    mouseWorldCoord *= uZoom;
    mouseWorldCoord += uOffset;

    vec2 mouseCellPos = mouseWorldCoord / uCellSize;
    vec2 mouseCellId = floor(mouseCellPos);

    vec2 cellCenter = cellId + 0.5;
    vec2 mouseCellCenter = mouseCellId + 0.5;
    float cellDistance = length(cellCenter - mouseCellCenter);
    float hoverIntensity = 1.0 - smoothstep(0.4, 0.7, cellDistance);
    bool isHovered = hoverIntensity > 0.0 && uMousePos.x >= 0.0;

    // atlas helpers
    float atlasSize = ceil(sqrt(uTextureCount));

    // --- NEW: compute blurred background only inside hovered cell ---
    // check if current fragment belongs to the hovered cell
    bool isMouseCell = isHovered && all(equal(cellId, mouseCellId));

    // hovered tile index (safe even if not hovered)
    float hoveredIndex = mod(mouseCellId.x + mouseCellId.y * 3.0, uTextureCount);
    vec2 hoveredAtlasPos = vec2(mod(hoveredIndex, atlasSize), floor(hoveredIndex / atlasSize));

    // For the current cell: build atlasUV that maps the full cell (0..1) to the tile
    // Use cellUV directly so the blurred image fills the whole square
    vec2 thisCellAtlasPos = vec2(mod(mod(cellId.x, atlasSize), atlasSize), floor(mod(cellId.y, atlasSize)));
    // Note: for sampling the hovered tile, prefer hoveredAtlasPos; for other tiles we use texIndex below.

    // compute blurred background for this fragment only when it's the hovered cell
    vec3 blurredBG = uBackgroundColor.rgb; // fallback
    if (isMouseCell) {
  // map cellUV (0..1) to atlas UV for hovered tile
  vec2 bgAtlasUV = (hoveredAtlasPos + cellUV) / atlasSize;
  bgAtlasUV.y = 1.0 - bgAtlasUV.y; // flip Y to match atlas orientation

  // scale blur radius with hoverIntensity for fade-in effect
  float effectiveBlur = uBackgroundBlur * hoverIntensity;

  blurredBG = blurSample(uImageAtlas, bgAtlasUV, effectiveBlur);
}


    // blend base background (when hovered, mix in blurredBG by hoverIntensity)
    vec3 backgroundColor = mix(uBackgroundColor.rgb, blurredBG, isMouseCell ? hoverIntensity : 0.0);



    // ===== Your existing grid & content rendering (unchanged) =====
    float lineWidth = 0.005;
    float gridX = smoothstep(0.0, lineWidth, cellUV.x) * smoothstep(0.0, lineWidth, 1.0 - cellUV.x);
    float gridY = smoothstep(0.0, lineWidth, cellUV.y) * smoothstep(0.0, lineWidth, 1.0 - cellUV.y);
    float gridMask = gridX * gridY;

    float imageSize = 0.6;
    float imageBorder = (1.0 - imageSize) * 0.5;

    vec2 imageUV = (cellUV - imageBorder) / imageSize;

    float edgeSmooth = 0.01;
    vec2 imageMask = smoothstep(-edgeSmooth, edgeSmooth, imageUV) *
                     smoothstep(-edgeSmooth, edgeSmooth, 1.0 - imageUV);
    float imageAlpha = imageMask.x * imageMask.y;

    bool inImageArea = imageUV.x >= 0.0 && imageUV.x <= 1.0 && imageUV.y >= 0.0 && imageUV.y <= 1.0;

    float textHeight = 0.08;
    float textY = 0.88;

    bool inTextArea = cellUV.x >= 0.05 && cellUV.x <= 0.95 && cellUV.y >= textY && cellUV.y <= (textY + textHeight);

    float texIndex = mod(cellId.x + cellId.y * 3.0, uTextureCount);

    vec3 color = backgroundColor;

    if (inImageArea && imageAlpha > 0.0) {
      vec2 atlasPos = vec2(mod(texIndex, atlasSize), floor(texIndex / atlasSize));
      vec2 atlasUV = (atlasPos + imageUV) / atlasSize;
      atlasUV.y = 1.0 - atlasUV.y;

      vec3 imageColor = texture2D(uImageAtlas, atlasUV).rgb;
      // image drawn over background (so blurredBG fills cell space while image sits on top)
      color = mix(color, imageColor, imageAlpha);
    }

    if (inTextArea) {
      vec2 textCoord = vec2((cellUV.x - 0.05) / 0.9, (cellUV.y - textY) / textHeight);
      textCoord.y = 1.0 - textCoord.y;

      vec2 atlasPos = vec2(mod(texIndex, atlasSize), floor(texIndex / atlasSize));
      vec2 atlasUV = (atlasPos + textCoord) / atlasSize;

      vec4 textColor = texture2D(uTextAtlas, atlasUV);
      vec3 textBgColor = backgroundColor;
      color = mix(textBgColor, textColor.rgb, textColor.a);
    }

    vec3 borderRGB = uBorderColor.rgb;
    float borderAlpha = uBorderColor.a;
    color = mix(color, borderRGB, (1.0 - gridMask) * borderAlpha);

    float fade = 1.0 - smoothstep(1.2, 1.8, radius);

    gl_FragColor = vec4(color * fade, 1.0);

    gl_FragColor.rgb = mix(gl_FragColor.rgb, uOverlayColor.rgb, uOverlayColor.a);
  }
`;
