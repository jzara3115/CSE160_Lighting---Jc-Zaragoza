// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_LightDir;
  varying vec3 v_NormalDir;
  varying vec3 v_WorldPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform vec3 u_lightPos;
  void main() {
    vec4 worldPos = u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_UV = a_UV;
    v_Normal = a_Normal;
    v_WorldPos = vec3(worldPos);
    v_LightDir = u_lightPos - vec3(worldPos);
    v_NormalDir = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;
  uniform float u_texColorWeight;
  uniform bool u_normalVisualization;
  uniform bool u_lightingOn;
  uniform bool u_pointLightOn;
  uniform bool u_spotLightOn;
  uniform vec3 u_lightPos;
  uniform vec3 u_lightColor;
  uniform vec3 u_spotLightPos;
  uniform vec3 u_spotLightDir;
  uniform vec3 u_cameraPos;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_LightDir;
  varying vec3 v_NormalDir;
  varying vec3 v_WorldPos;

  vec3 getPhongLight(vec3 lightDirection, vec3 normal, vec3 viewDirection, vec3 lightColor, vec3 baseColor) {
    float nDotL = max(dot(lightDirection, normal), 0.0);
    vec3 diffuse = lightColor * baseColor * nDotL;

    vec3 reflectDirection = reflect(-lightDirection, normal);
    float specularAmount = pow(max(dot(viewDirection, reflectDirection), 0.0), 16.0);
    vec3 specular = lightColor * specularAmount * 0.45;

    return diffuse + specular;
  }

  void main() {
    vec4 baseColor = u_FragColor;

    if (u_normalVisualization) {
      gl_FragColor = vec4(v_Normal, 1.0);
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0 || u_whichTexture == 1 || u_whichTexture == 2) {
      vec4 texColor;

      if (u_whichTexture == 0) {
        texColor = texture2D(u_Sampler0, v_UV);
      } else if (u_whichTexture == 1) {
        texColor = texture2D(u_Sampler1, v_UV);
      } else {
        texColor = texture2D(u_Sampler2, v_UV);
      }

      baseColor = (1.0 - u_texColorWeight) * baseColor + u_texColorWeight * texColor;
      if (!u_lightingOn) {
        gl_FragColor = baseColor;
        return;
      }

      vec3 normal = normalize(v_NormalDir);
      vec3 viewDirection = normalize(u_cameraPos - v_WorldPos);
      vec3 color = 0.25 * baseColor.rgb;

      if (u_pointLightOn) {
        color += getPhongLight(normalize(v_LightDir), normal, viewDirection, u_lightColor, baseColor.rgb);
      }

      if (u_spotLightOn) {
        vec3 spotToSurface = normalize(v_WorldPos - u_spotLightPos);
        float spotAmount = dot(spotToSurface, normalize(u_spotLightDir));

        if (spotAmount > 0.86) {
          vec3 spotLightDir = normalize(u_spotLightPos - v_WorldPos);
          color += getPhongLight(spotLightDir, normal, viewDirection, vec3(1.0, 0.8, 1.0), baseColor.rgb) * spotAmount;
        }
      }

      gl_FragColor = vec4(color, baseColor.a);
    } else {
      if (!u_lightingOn) {
        gl_FragColor = baseColor;
        return;
      }

      vec3 normal = normalize(v_NormalDir);
      vec3 viewDirection = normalize(u_cameraPos - v_WorldPos);
      vec3 color = 0.25 * baseColor.rgb;

      if (u_pointLightOn) {
        color += getPhongLight(normalize(v_LightDir), normal, viewDirection, u_lightColor, baseColor.rgb);
      }

      if (u_spotLightOn) {
        vec3 spotToSurface = normalize(v_WorldPos - u_spotLightPos);
        float spotAmount = dot(spotToSurface, normalize(u_spotLightDir));

        if (spotAmount > 0.86) {
          vec3 spotLightDir = normalize(u_spotLightPos - v_WorldPos);
          color += getPhongLight(spotLightDir, normal, viewDirection, vec3(1.0, 0.8, 1.0), baseColor.rgb) * spotAmount;
        }
      }

      gl_FragColor = vec4(color, baseColor.a);
    }
  }`;

//GLOBALS
let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal;
let u_FragColor;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_whichTexture;
let u_texColorWeight;
let u_normalVisualization;
let u_lightingOn;
let u_pointLightOn;
let u_spotLightOn;
let u_lightPos;
let u_lightColor;
let u_spotLightPos;
let u_spotLightDir;
let u_cameraPos;
let u_ModelMatrix;
let u_NormalMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let g_camera;

// Globals for UI
let g_globalAngle = 18;
let g_globalAngleX = -10;
let g_wingShoulder = 25;
let g_wingElbow = -25;
let g_wingWrist = 10;
let g_wingAnimation = true;
let g_idleAnimation = true;
let g_normalVisualization = false;
let g_lightingOn = true;
let g_pointLightOn = true;
let g_spotLightOn = true;
let g_lightSlide = 0;
let g_lightPos = [0, 2.3, -8];
let g_lightColorHue = 55;
let g_lightColor = [1.0, 0.9, 0.35];
let g_spotLightPos = [0.0, 2.8, -1.5];
let g_spotLightDir = [0.0, -0.35, -1.0];
let g_bunnyModel = null;

// Globals for animation
let g_startTime = performance.now() / 1000;
let g_seconds = 0;
let g_bodyBob = 0;
let g_headNod = 0;
let g_legSwing = 0;
let g_earWiggle = 0;
let g_activeShoulder = 0;
let g_activeElbow = 0;
let g_activeWrist = 0;

// Globals for poke animation
let g_pokeActive = false;
let g_pokeStartTime = 0;
let g_pokeSpread = 0;
let g_pokeJaw = 0;
let g_pokeTwist = 0;

// Globals for mouse camera rotation / pointer lock
let g_mouseOnCanvas = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_hasLastMouse = false;
let g_pointerLocked = false;

// Globals for performance
let g_fps = 0;
let g_worldZ = -3.0;

// 32x32 editable height map for the world.
// 0 = empty space, 1/2/3 = wall height in cube blocks.
// This is way easier to edit than hardcoding a bunch of cube calls.
var g_worldMap = [
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 1, 0, 0, 1, 1, 0, 1, 2, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 2, 0, 1, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 2, 0, 3, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 3, 2, 0, 2, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 0, 1, 0, 0, 2],
  [2, 0, 1, 1, 0, 2, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 2, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 0, 0, 0, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 1, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 1, 0, 0, 1, 1, 0, 1, 2, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 2, 0, 1, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 3, 2, 2, 0, 0, 0, 2, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 1, 1, 0, 2, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 2, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 0, 0, 0, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 1, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 3, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 3, 2, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 2],
  [2, 0, 0, 1, 0, 0, 1, 1, 0, 1, 2, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 2, 0, 1, 1, 0, 0, 2],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
];

let g_worldWalls = [];
let g_worldBuilt = false;
let g_lastBlockAction = '';
let g_loadedTextures = 0;
let g_textureCount = 3;

// Simple inventory / wow factor.
// 1-4 place different block styles. Slot 5 becomes the apple slot after you pick it up.
let g_selectedInventorySlot = 1;
let g_inventoryMessage = 'Press 1-4 to pick blocks. Pick up the apple to unlock slot 5.';
let g_worldBlockTypes = [];
var g_inventorySlots = {
  1: {name: 'Stone wall', textureNum: 2, texWeight: 1.0, color: [0.68, 0.66, 0.62, 1.0], typeId: 2},
  2: {name: 'Grass block', textureNum: 1, texWeight: 0.9, color: [0.16, 0.34, 0.16, 1.0], typeId: 1},
  3: {name: 'Sky-blue block', textureNum: 0, texWeight: 0.45, color: [0.25, 0.55, 0.95, 1.0], typeId: 0},
  4: {name: 'Dark marker block', textureNum: -2, texWeight: 0.0, color: [0.18, 0.10, 0.22, 1.0], typeId: 3},
  5: {name: 'Apple', isApple: true}
};

// Simple story/game state.
// Goal: find the apple, collect it, then bring it back to the bat.
// The apple position gets picked from an empty map square so it does not spawn inside a wall.
let g_applePos = [0.0, -0.18, 0.0];
let g_appleMapCell = null;
let g_appleVisible = true;
let g_hasApple = false;
let g_appleDelivered = false;
let g_storyMessage = 'Find the red apple in the maze. Click it to pick it up, then bring it back to the bat.';

function getWorldTextureType(x, z, y) {
  ensureWorldBlockTypes();
  var typeId = g_worldBlockTypes[z] ? g_worldBlockTypes[z][x] : 2;

  // 0 = sky texture, 1 = ground texture, 2 = wall texture, 3 = solid dark color.
  if (typeId === 0) {
    return 0;
  }
  if (typeId === 1) {
    return 1;
  }
  if (typeId === 3) {
    return -2;
  }
  return 2;
}

function getWorldBlockColor(x, z, y) {
  ensureWorldBlockTypes();
  var typeId = g_worldBlockTypes[z] ? g_worldBlockTypes[z][x] : 2;

  if (typeId === 0) {
    return [0.25, 0.55, 0.95, 1.0];
  }
  if (typeId === 1) {
    return [0.16, 0.34, 0.16, 1.0];
  }
  if (typeId === 3) {
    return [0.18, 0.10, 0.22, 1.0];
  }
  return [0.68, 0.66, 0.62, 1.0];
}

function getWorldBlockTextureWeight(x, z, y) {
  ensureWorldBlockTypes();
  var typeId = g_worldBlockTypes[z] ? g_worldBlockTypes[z][x] : 2;

  if (typeId === 3) {
    return 0.0;
  }
  if (typeId === 0) {
    return 0.45;
  }
  if (typeId === 1) {
    return 0.9;
  }
  return 1.0;
}


function setupWebGL() {
  canvas = document.getElementById('webgl');

  gl = canvas.getContext('webgl', {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return;
  }

  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (!u_Sampler2) {
    console.log('Failed to get the storage location of u_Sampler2');
    return;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return;
  }
  gl.uniform1i(u_whichTexture, -2);

  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  if (!u_texColorWeight) {
    console.log('Failed to get the storage location of u_texColorWeight');
    return;
  }
  gl.uniform1f(u_texColorWeight, 0.0);

  u_normalVisualization = gl.getUniformLocation(gl.program, 'u_normalVisualization');
  if (!u_normalVisualization) {
    console.log('Failed to get the storage location of u_normalVisualization');
    return;
  }
  gl.uniform1i(u_normalVisualization, 0);

  u_lightingOn = gl.getUniformLocation(gl.program, 'u_lightingOn');
  if (!u_lightingOn) {
    console.log('Failed to get the storage location of u_lightingOn');
    return;
  }
  gl.uniform1i(u_lightingOn, 1);

  u_pointLightOn = gl.getUniformLocation(gl.program, 'u_pointLightOn');
  if (!u_pointLightOn) {
    console.log('Failed to get the storage location of u_pointLightOn');
    return;
  }
  gl.uniform1i(u_pointLightOn, 1);

  u_spotLightOn = gl.getUniformLocation(gl.program, 'u_spotLightOn');
  if (!u_spotLightOn) {
    console.log('Failed to get the storage location of u_spotLightOn');
    return;
  }
  gl.uniform1i(u_spotLightOn, 1);

  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
  if (!u_lightColor) {
    console.log('Failed to get the storage location of u_lightColor');
    return;
  }
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);

  u_spotLightPos = gl.getUniformLocation(gl.program, 'u_spotLightPos');
  if (!u_spotLightPos) {
    console.log('Failed to get the storage location of u_spotLightPos');
    return;
  }
  gl.uniform3f(u_spotLightPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);

  u_spotLightDir = gl.getUniformLocation(gl.program, 'u_spotLightDir');
  if (!u_spotLightDir) {
    console.log('Failed to get the storage location of u_spotLightDir');
    return;
  }
  gl.uniform3f(u_spotLightDir, g_spotLightDir[0], g_spotLightDir[1], g_spotLightDir[2]);

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
    return;
  }
  gl.uniform3f(u_cameraPos, 0, 0, 0);

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, identityM.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, identityM.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, identityM.elements);
}

function initTextures() {
  // Multiple texture setup from the Matsuda MultiTexture idea.
  // Load everything once, connect each image to its own texture unit, then leave them there.
  // 0 = sky.jpg, 1 = ground.jpg, 2 = wall.jpg
  var textureInfo = [
    {file: 'sky.jpg', unit: gl.TEXTURE0, sampler: u_Sampler0, number: 0, name: 'sky'},
    {file: 'ground.jpg', unit: gl.TEXTURE1, sampler: u_Sampler1, number: 1, name: 'ground'},
    {file: 'wall.jpg', unit: gl.TEXTURE2, sampler: u_Sampler2, number: 2, name: 'wall'}
  ];

  g_loadedTextures = 0;
  g_textureCount = textureInfo.length;

  for (var i = 0; i < textureInfo.length; i++) {
    setupTexture(textureInfo[i]);
  }

  return true;
}

function setupTexture(info) {
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create texture object for ' + info.file);
    return false;
  }

  var image = new Image();
  if (!image) {
    console.log('Failed to create image object for ' + info.file);
    return false;
  }

  image.onload = function() {
    loadTexture(texture, info.sampler, image, info.unit, info.number, info.name);
  };

  image.onerror = function() {
    console.log('Failed to load ' + info.file + '. Make sure it is in the same folder as ColoredPoints.html.');
  };

  // All texture files should be square power-of-two images, like 64x64 or 256x256.
  image.src = info.file;
  return true;
}

function loadTexture(texture, u_Sampler, image, textureUnit, textureNumber, textureName) {
  // Flip the image because WebGL texture coordinates start from the bottom-left.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  // Put each texture into its own texture unit.
  gl.activeTexture(textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Power-of-two textures can safely repeat. This helps the ground/walls tile better.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // The sampler stores which texture unit it should read from.
  gl.uniform1i(u_Sampler, textureNumber);

  g_loadedTextures++;
  console.log('Loaded texture ' + textureName + ' into TEXTURE' + textureNumber);
  RenderAllShapes();
}

function addActionsForHtmlUI() {
  document.getElementById('angleSlide').addEventListener('mousemove', function() {
    g_globalAngle = Number(this.value);
    RenderAllShapes();
  });

  document.getElementById('angleXSlide').addEventListener('mousemove', function() {
    g_globalAngleX = Number(this.value);
    RenderAllShapes();
  });

  document.getElementById('wingShoulderSlide').addEventListener('mousemove', function() {
    g_wingShoulder = Number(this.value);
    RenderAllShapes();
  });

  document.getElementById('wingElbowSlide').addEventListener('mousemove', function() {
    g_wingElbow = Number(this.value);
    RenderAllShapes();
  });

  document.getElementById('wingWristSlide').addEventListener('mousemove', function() {
    g_wingWrist = Number(this.value);
    RenderAllShapes();
  });

  document.getElementById('animationWingOnButton').addEventListener('click', function() {
    g_wingAnimation = true;
  });

  document.getElementById('animationWingOffButton').addEventListener('click', function() {
    g_wingAnimation = false;
  });

  document.getElementById('animationIdleOnButton').addEventListener('click', function() {
    g_idleAnimation = true;
  });

  document.getElementById('animationIdleOffButton').addEventListener('click', function() {
    g_idleAnimation = false;
  });

  document.getElementById('normalOnButton').addEventListener('click', function() {
    g_normalVisualization = true;
    RenderAllShapes();
  });

  document.getElementById('normalOffButton').addEventListener('click', function() {
    g_normalVisualization = false;
    RenderAllShapes();
  });

  document.getElementById('lightingOnButton').addEventListener('click', function() {
    g_lightingOn = true;
    RenderAllShapes();
  });

  document.getElementById('lightingOffButton').addEventListener('click', function() {
    g_lightingOn = false;
    RenderAllShapes();
  });

  document.getElementById('pointLightOnButton').addEventListener('click', function() {
    g_pointLightOn = true;
    RenderAllShapes();
  });

  document.getElementById('pointLightOffButton').addEventListener('click', function() {
    g_pointLightOn = false;
    RenderAllShapes();
  });

  document.getElementById('spotLightOnButton').addEventListener('click', function() {
    g_spotLightOn = true;
    RenderAllShapes();
  });

  document.getElementById('spotLightOffButton').addEventListener('click', function() {
    g_spotLightOn = false;
    RenderAllShapes();
  });

  document.getElementById('lightSlide').addEventListener('mousemove', function() {
    g_lightSlide = Number(this.value);
    updateLightPosition();
    RenderAllShapes();
  });

  document.getElementById('lightColorSlide').addEventListener('mousemove', function() {
    g_lightColorHue = Number(this.value);
    updateLightColor();
    RenderAllShapes();
  });
}

function addMouseControls() {
  // Pointer lock keeps the cursor from leaving the canvas.
  // Click the canvas once to lock it. Press ESC to unlock it.
  document.addEventListener('pointerlockchange', updatePointerLockState);
  document.addEventListener('mozpointerlockchange', updatePointerLockState);

  canvas.onmouseenter = function(ev) {
    // Fallback tracking before pointer lock starts. This avoids a big first-move jump.
    g_mouseOnCanvas = true;
    g_hasLastMouse = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  canvas.onmouseleave = function() {
    // Once pointer lock is active, leaving the canvas does not matter anymore.
    if (!g_pointerLocked) {
      g_mouseOnCanvas = false;
      g_hasLastMouse = false;
    }
  };

  canvas.onmousedown = function(ev) {
    // First click should only lock the mouse.
    // Without this, the same click that locks pointer lock can accidentally place/delete a block.
    if (!g_pointerLocked) {
      requestPointerLockForCanvas();
      g_hasLastMouse = false;
      g_lastBlockAction = 'Mouse locked. Move mouse to look around. Press ESC to unlock.';
      ev.preventDefault();
      RenderAllShapes();
      return;
    }

    // Shift + left click still keeps the old poke animation.
    if (ev.shiftKey && ev.button === 0) {
      g_pokeActive = true;
      g_pokeStartTime = g_seconds;
      ev.preventDefault();
      return;
    }

    // Left click uses the selected inventory item.
    // If the crosshair is on the apple, collect it first. Otherwise place the selected block/item.
    if (ev.button === 0) {
      if (!tryCollectApple()) {
        placeSelectedItemInFront();
      }
      ev.preventDefault();
      RenderAllShapes();
      return;
    }

    // Right click first tries to give the apple to the bat. Then it tries to collect the apple.
    // If neither happens, it deletes a normal map block.
    if (ev.button === 2) {
      if (!tryDeliverAppleToBat() && !tryCollectApple()) {
        deleteBlockInFront();
      }
      ev.preventDefault();
      RenderAllShapes();
      return;
    }
  };

  // Use document mousemove so camera look keeps working while pointer locked.
  document.onmousemove = onMove;

  // Stop the browser menu so right click can delete blocks.
  canvas.oncontextmenu = function(ev) {
    ev.preventDefault();
    return false;
  };
}

function requestPointerLockForCanvas() {
  var requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;

  if (requestPointerLock && !isPointerLocked()) {
    requestPointerLock.call(canvas);
  }
}

function updatePointerLockState() {
  g_pointerLocked = isPointerLocked();

  if (g_pointerLocked) {
    // The browser does not literally move the cursor, but pointer lock hides it and gives
    // relative movement as if the mouse is centered forever. This prevents edge-of-canvas bugs.
    canvas.style.cursor = 'none';
    g_hasLastMouse = false;
    g_lastBlockAction = 'Pointer locked. Press ESC to unlock.';
  } else {
    canvas.style.cursor = 'default';
    g_lastBlockAction = 'Pointer unlocked. Click canvas to lock.';
    g_hasLastMouse = false;
  }

  RenderAllShapes();
}

function isPointerLocked() {
  return document.pointerLockElement === canvas || document.mozPointerLockElement === canvas;
}

function onMove(ev) {
  if (!g_camera) {
    return;
  }

  var dx = 0;
  var dy = 0;

  if (g_pointerLocked) {
    // Pointer lock gives movementX/movementY, so the cursor can stay locked while looking around.
    dx = ev.movementX || ev.mozMovementX || 0;
    dy = ev.movementY || ev.mozMovementY || 0;
  } else {
    // Fallback: still allow mouse-over look before the user clicks to lock.
    if (!g_mouseOnCanvas) {
      return;
    }

    if (!g_hasLastMouse) {
      g_hasLastMouse = true;
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;
      return;
    }

    dx = ev.clientX - g_lastMouseX;
    dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  }

  if (dx === 0 && dy === 0) {
    return;
  }

  // Horizontal mouse movement maps to Q/E pan. Vertical movement looks up/down.
  var mouseSensitivity = 0.18;
  var panAmount = dx * mouseSensitivity;
  var pitchAmount = dy * mouseSensitivity;

  if (panAmount > 0) {
    g_camera.panRight(panAmount);
  } else if (panAmount < 0) {
    g_camera.panLeft(-panAmount);
  }

  if (pitchAmount > 0) {
    g_camera.pitchDown(pitchAmount);
  } else if (pitchAmount < 0) {
    g_camera.pitchUp(-pitchAmount);
  }

  ev.preventDefault();
  RenderAllShapes();
}

function addKeyboardControls() {
  document.onkeydown = function(ev) {
    if (!g_camera) {
      return;
    }

    var key = ev.key.toLowerCase();

    if (key >= '1' && key <= '5') {
      selectInventorySlot(Number(key));
    } else if (key === 'w') {
      g_camera.moveForward();
    } else if (key === 's') {
      g_camera.moveBackwards();
    } else if (key === 'a') {
      g_camera.moveLeft();
    } else if (key === 'd') {
      // Not required in the step, but this makes camera movement feel complete.
      g_camera.moveRight();
    } else if (key === 'q') {
      g_camera.panLeft();
    } else if (key === 'e') {
      g_camera.panRight();
    } else if (key === 'b') {
      if (!tryCollectApple()) {
        placeSelectedItemInFront();
      }
    } else if (key === 'x') {
      if (!tryDeliverAppleToBat() && !tryCollectApple()) {
        deleteBlockInFront();
      }
    } else {
      return;
    }

    // Stop WASD/QE from accidentally scrolling or triggering browser shortcuts.
    ev.preventDefault();
    RenderAllShapes();
  };
}

function selectInventorySlot(slotNumber) {
  var slot = g_inventorySlots[slotNumber];
  if (!slot) {
    return false;
  }

  if (slot.isApple && !g_hasApple) {
    if (g_appleDelivered) {
      g_inventoryMessage = 'Apple slot is empty. You already gave the apple to the bat.';
    } else {
      g_inventoryMessage = 'Apple slot is locked until you pick up the apple.';
    }
    return false;
  }

  g_selectedInventorySlot = slotNumber;

  if (slot.isApple) {
    g_inventoryMessage = 'Selected apple. Left click an empty square to put it down, or right click the bat to give it to him.';
  } else {
    g_inventoryMessage = 'Selected ' + slot.name + '. Left click places it. Right click deletes blocks.';
  }

  return true;
}

function getSelectedInventorySlot() {
  return g_inventorySlots[g_selectedInventorySlot] || g_inventorySlots[1];
}

function placeSelectedItemInFront() {
  var slot = getSelectedInventorySlot();

  if (slot.isApple) {
    return placeAppleInFront();
  }

  return addBlockInFront();
}

function ensureWorldBlockTypes() {
  if (g_worldBlockTypes.length === g_worldMap.length) {
    return;
  }

  g_worldBlockTypes = [];
  for (var z = 0; z < g_worldMap.length; z++) {
    g_worldBlockTypes[z] = [];
    for (var x = 0; x < g_worldMap[z].length; x++) {
      g_worldBlockTypes[z][x] = 2; // default wall texture/type
    }
  }
}

function getMapCellInFront() {
  if (!g_camera) {
    return null;
  }

  var mapWidth = g_worldMap[0].length;
  var mapDepth = g_worldMap.length;
  var xOffset = -mapWidth / 2;
  var zOffset = -2;

  var eye = g_camera.eye.elements;
  var at = g_camera.at.elements;

  // Forward direction from the camera. I ignore Y so block editing stays on the map grid.
  var fx = at[0] - eye[0];
  var fz = at[2] - eye[2];
  var len = Math.sqrt(fx * fx + fz * fz);
  if (len < 0.0001) {
    return null;
  }
  fx /= len;
  fz /= len;

  // A small fixed reach feels close enough to Minecraft without needing real raytracing.
  var reach = 3.0;
  var targetX = eye[0] + fx * reach;
  var targetZ = eye[2] + fz * reach;

  var mapX = Math.floor(targetX - xOffset);
  var mapZ = Math.floor(zOffset - targetZ);

  if (mapX < 0 || mapX >= mapWidth || mapZ < 0 || mapZ >= mapDepth) {
    g_lastBlockAction = 'No map square in front';
    return null;
  }

  return {x: mapX, z: mapZ};
}


function getPointInFront(reach = 3.0) {
  if (!g_camera) {
    return null;
  }

  var eye = g_camera.eye.elements;
  var at = g_camera.at.elements;

  var fx = at[0] - eye[0];
  var fy = at[1] - eye[1];
  var fz = at[2] - eye[2];
  var len = Math.sqrt(fx * fx + fy * fy + fz * fz);
  if (len < 0.0001) {
    return null;
  }

  fx /= len;
  fy /= len;
  fz /= len;

  return [eye[0] + fx * reach, eye[1] + fy * reach, eye[2] + fz * reach];
}

function distance3(a, b) {
  var dx = a[0] - b[0];
  var dy = a[1] - b[1];
  var dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isLookingNearPoint(point, reach = 3.5, radius = 1.4) {
  var target = getPointInFront(reach);
  if (!target) {
    return false;
  }
  return distance3(target, point) <= radius;
}


function spawnAppleOnEmptyCell() {
  // Pick an empty map square for the apple. This prevents the apple from spawning inside a wall.
  // These are preferred spots first, then it falls back to scanning the whole map.
  var preferredCells = [
    [18, 9],   // close to the old apple location, but actually empty
    [16, 14],
    [15, 16],
    [21, 22],
    [5, 3]
  ];

  for (var i = 0; i < preferredCells.length; i++) {
    var cell = preferredCells[i];
    if (isMapCellEmpty(cell[0], cell[1])) {
      setAppleToMapCell(cell[0], cell[1]);
      return;
    }
  }

  for (var z = 0; z < g_worldMap.length; z++) {
    for (var x = 0; x < g_worldMap[z].length; x++) {
      if (isMapCellEmpty(x, z)) {
        setAppleToMapCell(x, z);
        return;
      }
    }
  }

  console.log('No empty map cell found for apple spawn.');
}

function isMapCellEmpty(mapX, mapZ) {
  if (mapZ < 0 || mapZ >= g_worldMap.length) {
    return false;
  }
  if (mapX < 0 || mapX >= g_worldMap[mapZ].length) {
    return false;
  }
  return g_worldMap[mapZ][mapX] === 0;
}

function setAppleToMapCell(mapX, mapZ) {
  var mapWidth = g_worldMap[0].length;
  var xOffset = -mapWidth / 2;
  var zOffset = -2;
  var appleSize = 0.35;

  g_appleMapCell = {x: mapX, z: mapZ};

  // Cube positions use the lower-left/lower-front corner, so this centers the apple in the empty grid square.
  g_applePos = [
    xOffset + mapX + 0.5 - appleSize / 2,
    -0.18,
    zOffset - mapZ + 0.5 - appleSize / 2
  ];
}

function isAppleCell(cell) {
  return g_appleVisible && g_appleMapCell && cell && cell.x === g_appleMapCell.x && cell.z === g_appleMapCell.z;
}

function tryCollectApple() {
  if (!g_appleVisible || g_hasApple || g_appleDelivered) {
    return false;
  }

  if (isLookingNearPoint(g_applePos, 3.0, 1.5)) {
    g_appleVisible = false;
    g_hasApple = true;
    g_selectedInventorySlot = 5;
    g_storyMessage = 'Apple collected. It is now in inventory slot 5. Press 1-4 to put it away, or press 5 to hold it again.';
    g_lastBlockAction = 'Apple collected. Slot 5 unlocked.';
    g_inventoryMessage = 'Apple selected in slot 5. Left click an empty square to put it down, or right click the bat to give it to him.';
    return true;
  }

  return false;
}

function tryDeliverAppleToBat() {
  if (!g_hasApple || g_appleDelivered) {
    return false;
  }

  var batPos = [0.0, 0.0, g_worldZ];

  if (isLookingNearPoint(batPos, 3.0, 1.8) || distance3(g_camera.eye.elements, batPos) < 3.0) {
    g_hasApple = false;
    g_selectedInventorySlot = 1;
    g_appleDelivered = true;
    g_pokeActive = true;
    g_pokeStartTime = g_seconds;
    g_storyMessage = 'You brought the apple to the bat. The bat is happy and the quest is complete.';
    g_lastBlockAction = 'Quest complete. Apple delivered to the bat.';
    g_inventoryMessage = 'Quest complete. Apple slot is empty now.';
    return true;
  }

  g_storyMessage = 'You have the apple. Get closer to the bat, look at it, then right click.';
  g_lastBlockAction = 'Not close enough to the bat yet.';
  return true;
}

function addBlockInFront() {
  var slot = getSelectedInventorySlot();
  if (slot.isApple) {
    return placeAppleInFront();
  }

  var cell = getMapCellInFront();
  if (!cell) {
    return false;
  }

  if (isAppleCell(cell)) {
    g_lastBlockAction = 'Apple is on that square. Pick it up before placing a block there.';
    return false;
  }

  ensureWorldBlockTypes();

  var maxHeight = 5;
  var currentHeight = g_worldMap[cell.z][cell.x];

  if (currentHeight >= maxHeight) {
    g_lastBlockAction = 'Block stack already max height at [' + cell.x + ', ' + cell.z + ']';
    return false;
  }

  g_worldMap[cell.z][cell.x] = currentHeight + 1;
  g_worldBlockTypes[cell.z][cell.x] = slot.typeId;
  g_worldBuilt = false;
  g_lastBlockAction = 'Placed ' + slot.name + ' at [' + cell.x + ', ' + cell.z + '] height ' + g_worldMap[cell.z][cell.x];
  return true;
}

function placeAppleInFront() {
  if (!g_hasApple || g_appleDelivered) {
    g_lastBlockAction = 'You do not have the apple right now.';
    return false;
  }

  var cell = getMapCellInFront();
  if (!cell) {
    return false;
  }

  if (g_worldMap[cell.z][cell.x] > 0) {
    g_lastBlockAction = 'Can not put the apple inside a block. Aim at an empty square.';
    return false;
  }

  setAppleToMapCell(cell.x, cell.z);
  g_appleVisible = true;
  g_hasApple = false;
  g_selectedInventorySlot = 1;
  g_storyMessage = 'You put the apple back down. Pick it up again when you are ready to bring it to the bat.';
  g_inventoryMessage = 'Apple placed in the world. Slot 5 is empty until you pick it up again.';
  g_lastBlockAction = 'Apple placed at [' + cell.x + ', ' + cell.z + ']';
  return true;
}

function deleteBlockInFront() {
  var cell = getMapCellInFront();
  if (!cell) {
    return;
  }

  var currentHeight = g_worldMap[cell.z][cell.x];

  if (currentHeight <= 0) {
    g_lastBlockAction = 'No block to delete at [' + cell.x + ', ' + cell.z + ']';
    return;
  }

  g_worldMap[cell.z][cell.x] = currentHeight - 1;
  if (g_worldMap[cell.z][cell.x] <= 0) {
    ensureWorldBlockTypes();
    g_worldBlockTypes[cell.z][cell.x] = 2;
  }
  g_worldBuilt = false;
  g_lastBlockAction = 'Deleted block at [' + cell.x + ', ' + cell.z + '] height ' + g_worldMap[cell.z][cell.x];
}

function main() {
  setupWebGL();
  g_camera = new Camera();
  spawnAppleOnEmptyCell();
  updateLightColor();
  connectVariablesToGLSL();
  loadBunnyModel();
  initTextures();
  addActionsForHtmlUI();
  addMouseControls();
  addKeyboardControls();

  gl.clearColor(0.02, 0.02, 0.05, 1.0);

  requestAnimationFrame(tick);
}

function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;

  updateLightPosition();
  updateAnimationAngles();
  RenderAllShapes();

  requestAnimationFrame(tick);
}

function loadBunnyModel() {
  g_bunnyModel = new Model();
  g_bunnyModel.loadObj('bunny.obj');
}

function updateLightPosition() {
  g_lightPos[0] = g_lightSlide + 4.0 * Math.cos(g_seconds);
  g_lightPos[1] = 2.3;
  g_lightPos[2] = -8.0 + 4.0 * Math.sin(g_seconds);
}

function updateLightColor() {
  var hue = g_lightColorHue / 60.0;
  var c = 1.0;
  var x = c * (1.0 - Math.abs(hue % 2.0 - 1.0));

  if (hue < 1.0) {
    g_lightColor = [c, x, 0.0];
  } else if (hue < 2.0) {
    g_lightColor = [x, c, 0.0];
  } else if (hue < 3.0) {
    g_lightColor = [0.0, c, x];
  } else if (hue < 4.0) {
    g_lightColor = [0.0, x, c];
  } else if (hue < 5.0) {
    g_lightColor = [x, 0.0, c];
  } else {
    g_lightColor = [c, 0.0, x];
  }
}

function updateAnimationAngles() {
  if (g_wingAnimation) {
    var flapRaw = Math.sin(g_seconds * 6.2);
    var downStroke = Math.max(0, flapRaw);
    var upStroke = Math.max(0, -flapRaw);

    g_activeShoulder = 10 + downStroke * 44 - upStroke * 18;
    g_activeElbow = -30 - downStroke * 32 + upStroke * 10;
    g_activeWrist = 7 + downStroke * 20 - upStroke * 8;

    document.getElementById('wingShoulderSlide').value = Math.round(g_activeShoulder);
    document.getElementById('wingElbowSlide').value = Math.round(g_activeElbow);
    document.getElementById('wingWristSlide').value = Math.round(g_activeWrist);
  } else {
    g_activeShoulder = g_wingShoulder;
    g_activeElbow = g_wingElbow;
    g_activeWrist = g_wingWrist;
  }

  if (g_idleAnimation) {
    g_bodyBob = 0.03 * Math.sin(g_seconds * 4.0);
    g_headNod = 5.0 * Math.sin(g_seconds * 3.0);
    g_legSwing = 18.0 * Math.sin(g_seconds * 6.0);
    g_earWiggle = 8.0 * Math.sin(g_seconds * 5.0);
  } else {
    g_bodyBob = 0;
    g_headNod = 0;
    g_legSwing = 0;
    g_earWiggle = 0;
  }

  if (g_pokeActive) {
    var elapsed = g_seconds - g_pokeStartTime;
    var duration = 0.9;

    if (elapsed <= duration) {
      var t = elapsed / duration;
      var pulse = Math.sin(Math.PI * t);
      g_pokeSpread = 62 * pulse;
      g_pokeJaw = 25 * pulse;
      g_pokeTwist = 30 * pulse;
    } else {
      g_pokeActive = false;
      g_pokeSpread = 0;
      g_pokeJaw = 0;
      g_pokeTwist = 0;
    }
  } else {
    g_pokeSpread = 0;
    g_pokeJaw = 0;
    g_pokeTwist = 0;
  }
}

function RenderAllShapes() {
  var startTime = performance.now();

  // Camera matrices now come from the Camera class.
  // The shader still receives projection, view, and model as separate uniforms.
  g_camera.updateProjectionMatrix();
  g_camera.updateViewMatrix();
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniform1i(u_normalVisualization, g_normalVisualization ? 1 : 0);
  gl.uniform1i(u_lightingOn, g_lightingOn ? 1 : 0);
  gl.uniform1i(u_pointLightOn, g_pointLightOn ? 1 : 0);
  gl.uniform1i(u_spotLightOn, g_spotLightOn ? 1 : 0);
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_spotLightPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  gl.uniform3f(u_spotLightDir, g_spotLightDir[0], g_spotLightDir[1], g_spotLightDir[2]);
  var eye = g_camera.eye.elements;
  gl.uniform3f(u_cameraPos, eye[0], eye[1], eye[2]);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawWorldBase();
  drawLightMarker();
  drawSpotLightMarker();
  drawAppleQuestObjects();

  var batRoot = new Matrix4();
  batRoot.translate(0, g_bodyBob - 0.15, g_worldZ);

  var body = new Cube();
  body.color = [0.12, 0.12, 0.14, 1.0];
  body.textureNum = 0;
  body.texColorWeight = 0.65;
  body.matrix = new Matrix4(batRoot);
  body.matrix.translate(-0.2, -0.1, -0.33);
  body.matrix.scale(0.4, 0.25, 0.66);
  body.render();

  var chest = new Cube();
  chest.color = [0.2, 0.2, 0.24, 1.0];
  chest.textureNum = 0;
  chest.texColorWeight = 0.85;
  chest.matrix = new Matrix4(batRoot);
  chest.matrix.translate(-0.08, -0.025, -0.2);
  chest.matrix.scale(0.16, 0.13, 0.26);
  chest.render();

  var headJoint = new Matrix4(batRoot);
  headJoint.translate(0, 0.12, -0.17);
  headJoint.rotate(g_headNod - g_pokeJaw * 0.5, 1, 0, 0);

  var head = new Cube();
  head.color = [0.1, 0.1, 0.12, 1.0];
  head.matrix = new Matrix4(headJoint);
  head.matrix.translate(-0.15, 0.0, -0.235);
  head.matrix.scale(0.32, 0.22, 0.28);
  head.render();

  var leftEar = new Cube();
  leftEar.color = [0.17, 0.1, 0.16, 1.0];
  leftEar.matrix = new Matrix4(headJoint);
  leftEar.matrix.translate(-0.14, 0.2, -0.06);
  leftEar.matrix.rotate(-20 + g_earWiggle, 0, 0, 1);
  leftEar.matrix.scale(0.08, 0.18, 0.06);
  leftEar.render();

  var rightEar = new Cube();
  rightEar.color = [0.17, 0.1, 0.16, 1.0];
  rightEar.matrix = new Matrix4(headJoint);
  rightEar.matrix.translate(0.06, 0.2, -0.06);
  rightEar.matrix.rotate(20 - g_earWiggle, 0, 0, 1);
  rightEar.matrix.scale(0.08, 0.18, 0.06);
  rightEar.render();

  var leftEye = new Cube();
  leftEye.color = [0.01, 0.01, 0.01, 1.0];
  leftEye.matrix = new Matrix4(headJoint);
  leftEye.matrix.translate(-0.09, 0.098, -0.248);
  leftEye.matrix.scale(0.055, 0.05, 0.022);
  leftEye.render();

  var rightEye = new Cube();
  rightEye.color = [0.01, 0.01, 0.01, 1.0];
  rightEye.matrix = new Matrix4(headJoint);
  rightEye.matrix.translate(0.05, 0.098, -0.248);
  rightEye.matrix.scale(0.055, 0.05, 0.022);
  rightEye.render();

  var leftEyeShine = new Cube();
  leftEyeShine.color = [1.0, 1.0, 1.0, 1.0];
  leftEyeShine.matrix = new Matrix4(headJoint);
  leftEyeShine.matrix.translate(-0.078, 0.118, -0.254);
  leftEyeShine.matrix.scale(0.008, 0.008, 0.01);
  leftEyeShine.render();

  var rightEyeShine = new Cube();
  rightEyeShine.color = [1.0, 1.0, 1.0, 1.0];
  rightEyeShine.matrix = new Matrix4(headJoint);
  rightEyeShine.matrix.translate(0.062, 0.118, -0.254);
  rightEyeShine.matrix.scale(0.008, 0.008, 0.01);
  rightEyeShine.render();

  var nose = new Cone();
  nose.color = [0.22, 0.12, 0.18, 1.0];
  nose.matrix = new Matrix4(headJoint);
  nose.matrix.translate(0.0, 0.06, -0.225);
  nose.matrix.rotate(-90, 1, 0, 0);
  nose.matrix.scale(0.08, 0.12, 0.08);
  nose.render();

  if (g_pokeJaw > 0.1) {
    var jawJoint = new Matrix4(headJoint);
    jawJoint.translate(0.0, 0.005, -0.205);
    jawJoint.rotate(g_pokeJaw * 1.35, 1, 0, 0);

    var lowerJaw = new Cube();
    lowerJaw.color = [0.11, 0.07, 0.09, 1.0];
    lowerJaw.matrix = new Matrix4(jawJoint);
    lowerJaw.matrix.translate(-0.075, -0.03, -0.03);
    lowerJaw.matrix.scale(0.15, 0.04, 0.06);
    lowerJaw.render();

    var leftFang = new Cone();
    leftFang.color = [0.95, 0.95, 0.92, 1.0];
    leftFang.matrix = new Matrix4(jawJoint);
    leftFang.matrix.translate(-0.045, -0.02, -0.005);
    leftFang.matrix.rotate(180, 1, 0, 0);
    leftFang.matrix.scale(0.015, 0.065, 0.015);
    leftFang.render();

    var rightFang = new Cone();
    rightFang.color = [0.95, 0.95, 0.92, 1.0];
    rightFang.matrix = new Matrix4(jawJoint);
    rightFang.matrix.translate(0.045, -0.02, -0.005);
    rightFang.matrix.rotate(180, 1, 0, 0);
    rightFang.matrix.scale(0.015, 0.065, 0.015);
    rightFang.render();
  }

  var tail = new Cube();
  tail.color = [0.08, 0.08, 0.1, 1.0];
  tail.matrix = new Matrix4(batRoot);
  tail.matrix.translate(-0.055, -0.21, 0.32);
  tail.matrix.rotate(-20, 1, 0, 0);
  tail.matrix.scale(0.12, 0.22, 0.1);
  tail.render();

  var leftShoulderSocket = new Cube();
  leftShoulderSocket.color = [0.14, 0.12, 0.17, 1.0];
  leftShoulderSocket.matrix = new Matrix4(batRoot);
  leftShoulderSocket.matrix.translate(-0.2, 0.0, -0.14);
  leftShoulderSocket.matrix.scale(0.055, 0.06, 0.06);
  leftShoulderSocket.render();

  var rightShoulderSocket = new Cube();
  rightShoulderSocket.color = [0.14, 0.12, 0.17, 1.0];
  rightShoulderSocket.matrix = new Matrix4(batRoot);
  rightShoulderSocket.matrix.translate(0.145, 0.0, -0.14);
  rightShoulderSocket.matrix.scale(0.055, 0.06, 0.06);
  rightShoulderSocket.render();

  drawLeg(batRoot, -0.07, 0.18, -1, g_legSwing);
  drawLeg(batRoot, -0.01, 0.18, 1, -g_legSwing);

  drawWing(
    batRoot,
    -1,
    g_activeShoulder - g_pokeSpread,
    g_activeElbow - 0.4 * g_pokeSpread,
    g_activeWrist - 0.2 * g_pokeSpread
  );

  drawWing(
    batRoot,
    1,
    -g_activeShoulder + g_pokeSpread,
    -g_activeElbow + 0.4 * g_pokeSpread,
    -g_activeWrist + 0.2 * g_pokeSpread
  );

  var duration = performance.now() - startTime;
  var instantFps = 1000 / Math.max(0.001, duration);
  g_fps = g_fps === 0 ? instantFps : g_fps * 0.9 + instantFps * 0.1;

  var blockStatus = g_lastBlockAction ? ' | ' + g_lastBlockAction : '';
  var textureStatus = ' | textures: ' + g_loadedTextures + '/' + g_textureCount;
  sendTextToHTML('FPS: ' + g_fps.toFixed(1) + ' | frame ms: ' + duration.toFixed(2) + textureStatus + blockStatus,'numdotsspan');
  updateStoryText();
  updateInventoryText();
}

function drawLightMarker() {
  var light = new Cube();
  light.color = [1.0, 1.0, 0.0, 1.0];
  light.textureNum = -2;
  light.texColorWeight = 0.0;
  light.matrix.translate(g_lightPos[0] - 0.1, g_lightPos[1] - 0.1, g_lightPos[2] - 0.1);
  light.matrix.scale(0.2, 0.2, 0.2);
  light.render();
}

function drawSpotLightMarker() {
  var spot = new Cube();
  spot.color = [1.0, 0.3, 1.0, 1.0];
  spot.textureNum = -2;
  spot.texColorWeight = 0.0;
  spot.matrix.translate(g_spotLightPos[0] - 0.08, g_spotLightPos[1] - 0.08, g_spotLightPos[2] - 0.08);
  spot.matrix.scale(0.16, 0.16, 0.16);
  spot.render();

  var beam = new Cone();
  beam.color = [0.7, 0.15, 0.9, 1.0];
  beam.matrix.translate(g_spotLightPos[0], g_spotLightPos[1] - 0.45, g_spotLightPos[2] - 0.45);
  beam.matrix.rotate(65, 1, 0, 0);
  beam.matrix.scale(0.12, 0.45, 0.12);
  beam.render();
}


function drawWorldBase() {
  // Sky box: giant cube centered around the world.
  // It uses only the base color, so it stays solid blue instead of textured.
  // Since the camera is inside this cube, depth writing is turned off so it acts like a background.
  gl.depthMask(false);
  var sky = new Cube();
  sky.color = [0.25, 0.55, 0.95, 1.0];
  sky.textureNum = 0;
  sky.texColorWeight = 0.35;
  sky.matrix.translate(-500, -500, -500);
  sky.matrix.scale(1000, 1000, 1000);
  sky.render();
  gl.depthMask(true);

  // Ground: flattened cube in the x-z plane.
  // A cube already has its top/bottom faces in the x-z plane, so flattening Y makes it a ground plane.
  var ground = new Cube();
  ground.color = [0.16, 0.34, 0.16, 1.0];
  ground.textureNum = 1;
  ground.texColorWeight = 0.85;
  ground.matrix.translate(-25, -0.75, -34);
  ground.matrix.scale(50, 0.05, 40);
  ground.render();

  // Build the wall cubes from the editable 32x32 map one time, then render them every frame.
  // This keeps the code from becoming 100+ manual drawCube calls.
  if (!g_worldBuilt) {
    buildWorldWalls();
  }

  for (var i = 0; i < g_worldWalls.length; i++) {
    g_worldWalls[i].render();
  }

  drawWorldLandmarks();
}


function drawAppleQuestObjects() {
  // Apple quest object. It is just made out of cubes so it fits with the rest of the assignment.
  if (g_appleVisible) {
    drawAppleAt(g_applePos[0], g_applePos[1], g_applePos[2]);
  }

  // When the player is carrying the apple, draw a tiny apple in front of the camera.
  // This is a simple visual reminder that the apple has been picked up.
  if (g_hasApple && g_selectedInventorySlot === 5) {
    var held = getPointInFront(0.75);
    if (held) {
      drawAppleAt(held[0] - 0.08, held[1] - 0.2, held[2], 0.18);
    }
  }
}

function drawAppleAt(x, y, z, size = 0.35) {
  var apple = new Cube();
  apple.color = [0.95, 0.05, 0.03, 1.0];
  apple.textureNum = -2;
  apple.texColorWeight = 0.0;
  apple.matrix.translate(x, y, z);
  apple.matrix.scale(size, size, size);
  apple.render();

  var stem = new Cube();
  stem.color = [0.22, 0.11, 0.03, 1.0];
  stem.textureNum = -2;
  stem.texColorWeight = 0.0;
  stem.matrix.translate(x + size * 0.42, y + size, z + size * 0.42);
  stem.matrix.scale(size * 0.15, size * 0.32, size * 0.15);
  stem.render();

  var leaf = new Cube();
  leaf.color = [0.08, 0.55, 0.12, 1.0];
  leaf.textureNum = -2;
  leaf.texColorWeight = 0.0;
  leaf.matrix.translate(x + size * 0.55, y + size * 1.12, z + size * 0.35);
  leaf.matrix.rotate(25, 0, 0, 1);
  leaf.matrix.scale(size * 0.28, size * 0.08, size * 0.16);
  leaf.render();
}

function updateStoryText() {
  var status = g_storyMessage;

  if (!g_appleDelivered && !g_hasApple && g_appleVisible) {
    status += ' Apple location: around x=' + g_applePos[0].toFixed(1) + ', z=' + g_applePos[2].toFixed(1) + '.';
  }

  if (g_hasApple) {
    status += ' Apple is in slot 5. Press 5 to hold it, press 1-4 to put it away, or right click the bat to hand it over.';
  }

  sendTextToHTML('Quest: ' + status, 'storyspan');
}

function updateInventoryText() {
  var parts = [];
  for (var i = 1; i <= 5; i++) {
    var slot = g_inventorySlots[i];
    var label = i + ':';

    if (slot.isApple) {
      label += g_hasApple ? 'Apple' : 'Apple(empty)';
    } else {
      label += slot.name;
    }

    if (i === g_selectedInventorySlot) {
      label = '[' + label + ']';
    }

    parts.push(label);
  }

  sendTextToHTML('Inventory: ' + parts.join(' | ') + '<br />' + g_inventoryMessage, 'inventoryspan');
}

function buildWorldWalls() {
  ensureWorldBlockTypes();
  g_worldWalls = [];

  var mapWidth = g_worldMap[0].length;
  var mapDepth = g_worldMap.length;
  var xOffset = -mapWidth / 2;
  var zOffset = -2;

  for (var z = 0; z < mapDepth; z++) {
    for (var x = 0; x < mapWidth; x++) {
      var wallHeight = g_worldMap[z][x];

      if (wallHeight > 0) {
        // Third loop stacks cubes upward based on the number in the map.
        for (var y = 0; y < wallHeight; y++) {
          var wall = new Cube();
          wall.color = getWorldBlockColor(x, z, y);
          wall.textureNum = getWorldTextureType(x, z, y);
          wall.texColorWeight = getWorldBlockTextureWeight(x, z, y);
          wall.matrix.translate(xOffset + x, -0.7 + y, zOffset - z);
          wall.matrix.scale(1.0, 1.0, 1.0);
          g_worldWalls.push(wall);
        }
      }
    }
  }

  g_worldBuilt = true;
}

function drawWorldLandmarks() {
  // A few simple colored landmarks so the world is not just repeated texture walls.
  // These also keep the texture/color rubric point visible.
  drawWorldBlock(-6.0, -0.7, -10.0, [0.35, 0.18, 0.10, 1.0], 0.0, 1.5, 1.5, 1.5);
  drawWorldBlock(7.0, -0.7, -16.0, [0.15, 0.22, 0.42, 1.0], 0.0, 1.5, 2.0, 1.5);
  drawWorldBlock(0.0, -0.7, -28.0, [0.42, 0.18, 0.28, 1.0], 0.0, 2.0, 1.0, 2.0);

  var sphere = new Sphere();
  sphere.color = [0.85, 0.85, 0.95, 1.0];
  sphere.matrix.translate(3.0, 0.15, -6.0);
  sphere.matrix.scale(0.65, 0.65, 0.65);
  sphere.render();

  if (g_bunnyModel && g_bunnyModel.loaded) {
    g_bunnyModel.color = [0.78, 0.7, 0.58, 1.0];
    g_bunnyModel.matrix.setIdentity();
    g_bunnyModel.matrix.translate(-3.0, -0.7, -6.5);
    g_bunnyModel.matrix.rotate(180, 0, 1, 0);
    g_bunnyModel.matrix.scale(0.35, 0.35, 0.35);
    g_bunnyModel.render();
  }
}

function drawWorldBlock(x, y, z, color, texWeight, sx = 1.0, sy = 1.0, sz = 1.0, textureNum = 2) {
  var block = new Cube();
  block.color = color;
  block.textureNum = textureNum;
  block.texColorWeight = texWeight;
  block.matrix.translate(x, y, z);
  block.matrix.scale(sx, sy, sz);
  block.render();
}

function drawLeg(root, xOffset, zOffset, sideSign, upperAngle) {
  var hip = new Matrix4(root);
  hip.translate(xOffset, -0.08, zOffset);
  hip.rotate(upperAngle, 1, 0, 0);

  var upper = new Cube();
  upper.color = [0.1, 0.1, 0.12, 1.0];
  upper.matrix = new Matrix4(hip);
  upper.matrix.translate(0, -0.15, 0);
  upper.matrix.scale(0.06, 0.15, 0.06);
  upper.render();

  var knee = new Matrix4(hip);
  knee.translate(0.008, -0.15, 0.008);
  knee.rotate(25 + sideSign * 8, 1, 0, 0);

  var lower = new Cube();
  lower.color = [0.12, 0.08, 0.1, 1.0];
  lower.matrix = new Matrix4(knee);
  lower.matrix.translate(0, -0.11, 0);
  lower.matrix.scale(0.045, 0.11, 0.045);
  lower.render();
}

function drawWing(root, side, shoulderAngle, elbowAngle, wristAngle) {
  var shoulder = new Matrix4(root);
  shoulder.translate(0.2 * side, 0.03, -0.005);
  shoulder.rotate(shoulderAngle, 0, 0, 1);
  shoulder.rotate(-8 * side, 0, 1, 0);

  var membraneColor = [0.12, 0.08, 0.15, 1.0];
  var boneColor = [0.2, 0.17, 0.23, 1.0];

  var pokeFold = g_pokeActive ? g_pokeSpread / 62 : 0;
  var torsoSpan = 0.5;
  var wingSpan = torsoSpan;
  var wingWidth = 0.004;
  var wingDepth = 0.08;
  var boneDepth = 0.04;
  var wingSpanZ = 3;

  if (g_pokeActive) {
    wingSpan = torsoSpan * 0.92;
    wingWidth = 0.004;
    wingDepth = 0.07;
    boneDepth = 0.026;
    wingSpanZ = 3;
  }

  var rootMembrane = new Cube();
  rootMembrane.color = membraneColor;
  rootMembrane.matrix = new Matrix4(shoulder);
  rootMembrane.matrix.translate(-0.2 * side, -0.06, -wingSpanZ * 0.1);
  rootMembrane.matrix.rotate(-8 * side, 0, 0, 1);
  rootMembrane.matrix.scale(0.48 * side, wingWidth * 8.0, wingSpanZ * 0.16);
  rootMembrane.render();

  var panelA = new Cube();
  panelA.color = membraneColor;
  panelA.matrix = new Matrix4(shoulder);
  panelA.matrix.translate(-0.01 * side, -0.11, -wingSpanZ * 0.1);
  panelA.matrix.rotate((-16 - pokeFold * 10) * side, 0, 0, 1);
  panelA.matrix.scale(0.74 * side, wingWidth * 9.0, wingSpanZ * 0.18);
  panelA.render();

  var upperWing = new Cube();
  upperWing.color = boneColor;
  upperWing.matrix = new Matrix4(shoulder);
  upperWing.matrix.translate(0, -0.013, -wingSpanZ * 0.03);
  upperWing.matrix.scale(wingSpan * side, wingWidth, wingSpanZ * 0.06);
  upperWing.render();

  var fingerA = new Cube();
  fingerA.color = boneColor;
  fingerA.matrix = new Matrix4(shoulder);
  fingerA.matrix.translate(0.18 * side, -0.012, -wingSpanZ * 0.015);
  fingerA.matrix.rotate((-28 - pokeFold * 6) * side, 0, 0, 1);
  fingerA.matrix.scale(0.58 * side, wingWidth * 0.6, wingSpanZ * 0.05);
  fingerA.render();

  var ribA = new Cube();
  ribA.color = boneColor;
  ribA.matrix = new Matrix4(shoulder);
  ribA.matrix.translate(0.3 * side, -0.055, -wingSpanZ * 0.015);
  ribA.matrix.rotate((-50 - pokeFold * 10) * side, 0, 0, 1);
  ribA.matrix.scale(0.5 * side, wingWidth * 0.5, wingSpanZ * 0.05);
  ribA.render();

  var elbow = new Matrix4(shoulder);
  elbow.translate(wingSpan * side, 0.0, 0.0);
  elbow.rotate((elbowAngle - pokeFold * 14), 0, 0, 1);

  var panelB = new Cube();
  panelB.color = membraneColor;
  panelB.matrix = new Matrix4(elbow);
  panelB.matrix.translate(0.01 * side, -0.105, -wingSpanZ * 0.1);
  panelB.matrix.rotate((-22 - pokeFold * 8) * side, 0, 0, 1);
  panelB.matrix.scale(0.56 * side, wingWidth * 8.5, wingSpanZ * 0.18);
  panelB.render();

  var lowerWing = new Cube();
  lowerWing.color = boneColor;
  lowerWing.matrix = new Matrix4(elbow);
  lowerWing.matrix.translate(0, -0.012, -wingSpanZ * 0.03);
  lowerWing.matrix.scale(wingSpan * 0.9 * side, wingWidth * 1.2, wingSpanZ * 0.06);
  lowerWing.render();

  var fingerB = new Cube();
  fingerB.color = boneColor;
  fingerB.matrix = new Matrix4(elbow);
  fingerB.matrix.translate(0.12 * side, -0.01, -wingSpanZ * 0.015);
  fingerB.matrix.rotate((-24 - pokeFold * 6) * side, 0, 0, 1);
  fingerB.matrix.scale(0.48 * side, wingWidth * 0.6, wingSpanZ * 0.05);
  fingerB.render();

  var ribB = new Cube();
  ribB.color = boneColor;
  ribB.matrix = new Matrix4(elbow);
  ribB.matrix.translate(0.24 * side, -0.05, -wingSpanZ * 0.015);
  ribB.matrix.rotate((-48 - pokeFold * 10) * side, 0, 0, 1);
  ribB.matrix.scale(0.42 * side, wingWidth * 0.5, wingSpanZ * 0.05);
  ribB.render();

  var wrist = new Matrix4(elbow);
  wrist.translate(wingSpan * 0.9 * side, 0.0, 0.0);
  wrist.rotate((wristAngle - pokeFold * 10), 0, 0, 1);

  var panelC = new Cube();
  panelC.color = membraneColor;
  panelC.matrix = new Matrix4(wrist);
  panelC.matrix.translate(0.0 * side, -0.078, -wingSpanZ * 0.1);
  panelC.matrix.rotate((-30 - pokeFold * 8) * side, 0, 0, 1);
  panelC.matrix.scale(0.44 * side, wingWidth * 6.5, wingSpanZ * 0.18);
  panelC.render();

  var hand = new Cube();
  hand.color = boneColor;
  hand.matrix = new Matrix4(wrist);
  hand.matrix.translate(0, -0.01, -wingSpanZ * 0.015);
  hand.matrix.scale(wingSpan * 0.62 * side, wingWidth * 0.9, wingSpanZ * 0.05);
  hand.render();

  var fingerC = new Cube();
  fingerC.color = boneColor;
  fingerC.matrix = new Matrix4(wrist);
  fingerC.matrix.translate(0.12 * side, -0.009, -wingSpanZ * 0.015);
  fingerC.matrix.rotate((-20 - pokeFold * 6) * side, 0, 0, 1);
  fingerC.matrix.scale(0.34 * side, wingWidth * 0.5, wingSpanZ * 0.05);
  fingerC.render();

  var ribC = new Cube();
  ribC.color = boneColor;
  ribC.matrix = new Matrix4(wrist);
  ribC.matrix.translate(0.18 * side, -0.05, -wingSpanZ * 0.015);
  ribC.matrix.rotate((-44 - pokeFold * 8) * side, 0, 0, 1);
  ribC.matrix.scale(0.32 * side, wingWidth * 0.45, wingSpanZ * 0.05);
  ribC.render();

  var wingTip = new Cone();
  wingTip.color = [0.18, 0.08, 0.22, 1.0];
  wingTip.matrix = new Matrix4(wrist);
  wingTip.matrix.translate(wingSpan * 0.5 * side, -0.01, 0.0);
  wingTip.matrix.rotate(-90 * side, 0, 0, 1);
  wingTip.matrix.scale(0.04, 0.15, 0.04);
  wingTip.render();
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log('Failed to get ' + htmlID + ' from HTML');
    return;
  }
  htmlElm.innerHTML = text;
}
