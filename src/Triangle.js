class Triangle {
    constructor(){
        this.type='triangle';
        this.position = [0, 0, 0];
        this.color = [1, 1, 1, 1];
        this.size = 10;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;

        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        gl.uniform1f(u_Size, size);

        // Draw
        var d = this.size / 200;
        drawTriangle([xy[0], xy[1], xy[0]+.1, xy[1], xy[0], xy[1]+.1]);
    }
}

let g_triangleBuffer2D = null;
let g_triangleBuffer3D = null;
let g_normalBuffer2D = null;
let g_normalBuffer3D = null;

// Each has position first, then UV after it:
// 2D: x, y, u, v
// 3D: x, y, z, u, v
function buildInterleavedData(vertices, uv, dimensions) {
    var n = vertices.length / dimensions;
    var defaultUV = [0, 0, 1, 0, 1, 1];
    var useUV = uv && uv.length >= n * 2 ? uv : defaultUV;
    var data = [];

    for (var i = 0; i < n; i++) {
        for (var j = 0; j < dimensions; j++) {
            data.push(vertices[i * dimensions + j]);
        }

        var uvIndex = (i * 2) % useUV.length;
        data.push(useUV[uvIndex]);
        data.push(useUV[uvIndex + 1]);
    }

    return new Float32Array(data);
}

function connectInterleavedAttributes(data, dimensions) {
    var FSIZE = data.BYTES_PER_ELEMENT;
    var stride = FSIZE * (dimensions + 2);

    gl.vertexAttribPointer(a_Position, dimensions, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(a_Position);

    // Guard is here so the old files/pages still do not crash if a_UV has not been added yet.
    if (typeof a_UV !== 'undefined' && a_UV >= 0) {
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, FSIZE * dimensions);
        gl.enableVertexAttribArray(a_UV);
    }
}

function connectNormalAttribute(normals, n, dimensions) {
    if (typeof a_Normal !== 'undefined' && a_Normal >= 0) {
        var defaultNormal = [1, 1, 0];
        var data = [];

        for (var i = 0; i < n; i++) {
            var normalIndex = i * 3;

            if (normals && normals.length >= normalIndex + 3) {
                data.push(normals[normalIndex]);
                data.push(normals[normalIndex + 1]);
                data.push(normals[normalIndex + 2]);
            } else {
                data.push(defaultNormal[0]);
                data.push(defaultNormal[1]);
                data.push(defaultNormal[2]);
            }
        }

        var normalData = new Float32Array(data);
        var normalBuffer = dimensions === 2 ? g_normalBuffer2D : g_normalBuffer3D;

        if (!normalBuffer) {
            normalBuffer = gl.createBuffer();
            if (dimensions === 2) {
                g_normalBuffer2D = normalBuffer;
            } else {
                g_normalBuffer3D = normalBuffer;
            }
        }
        if (!normalBuffer) {
            console.log('Failed to create the normal buffer object');
            return -1;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normalData, gl.DYNAMIC_DRAW);

        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);
    }
}

function drawTriangle(vertices, uv) {
    var n = vertices.length / 2;

    if (!g_triangleBuffer2D) {
        g_triangleBuffer2D = gl.createBuffer();
    }
    if (!g_triangleBuffer2D) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    var data = buildInterleavedData(vertices, uv, 2);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_triangleBuffer2D);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    connectInterleavedAttributes(data, 2);
    connectNormalAttribute(null, n, 2);

    gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3D(vertices, uv) {
    drawTriangle3DUV(vertices, uv);
}

function drawTriangle3DUV(vertices, uv, normals) {
    var n = vertices.length / 3;

    if (!g_triangleBuffer3D) {
        g_triangleBuffer3D = gl.createBuffer();
    }
    if (!g_triangleBuffer3D) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    var data = buildInterleavedData(vertices, uv, 3);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_triangleBuffer3D);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    connectInterleavedAttributes(data, 3);
    connectNormalAttribute(normals, n, 3);

    gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3DUVNormal(vertices, uv, normals) {
    drawTriangle3DUV(vertices, uv, normals);
}
