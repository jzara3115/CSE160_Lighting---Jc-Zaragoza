class Model {
    constructor(){
        this.type='model';
        this.color = [0.78, 0.72, 0.62, 1.0];
        this.textureNum = -2;
        this.texColorWeight = 0.0;
        this.matrix = new Matrix4();
        this.vertices = [];
        this.normals = [];
        this.uvs = [];
        this.vertexBuffer = null;
        this.normalBuffer = null;
        this.uvBuffer = null;
        this.numVertices = 0;
        this.loaded = false;
    }

    loadObj(fileName) {
        var self = this;

        fetch(fileName)
            .then(function(response) {
                return response.text();
            })
            .then(function(text) {
                self.parseObj(text);
                self.initBuffers();
                self.loaded = true;
                RenderAllShapes();
            })
            .catch(function(error) {
                console.log('Could not load OBJ file: ' + fileName);
                console.log(error);
            });
    }

    parseObj(text) {
        var positions = [];
        var objNormals = [];
        var lines = text.split('\n');

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();

            if (line.length === 0 || line[0] === '#') {
                continue;
            }

            var parts = line.split(/\s+/);

            if (parts[0] === 'v') {
                positions.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
            } else if (parts[0] === 'vn') {
                objNormals.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
            } else if (parts[0] === 'f') {
                this.addFace(parts, positions, objNormals);
            }
        }

        this.numVertices = this.vertices.length / 3;
    }

    addFace(parts, positions, objNormals) {
        for (var i = 2; i < parts.length - 1; i++) {
            this.addObjVertex(parts[1], positions, objNormals);
            this.addObjVertex(parts[i], positions, objNormals);
            this.addObjVertex(parts[i + 1], positions, objNormals);
        }
    }

    addObjVertex(vertexText, positions, objNormals) {
        var pieces = vertexText.split('/');
        var vIndex = Number(pieces[0]) - 1;
        var nIndex = pieces.length >= 3 && pieces[2] !== '' ? Number(pieces[2]) - 1 : -1;
        var pos = positions[vIndex];
        var normal = nIndex >= 0 ? objNormals[nIndex] : pos;

        this.vertices.push(pos[0], pos[1], pos[2]);
        this.normals.push(normal[0], normal[1], normal[2]);
        this.uvs.push(0, 0);
    }

    initBuffers() {
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);
    }

    render() {
        if (!this.loaded) {
            return;
        }

        var rgba = this.color;

        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform1f(u_texColorWeight, this.texColorWeight);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.matrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    }
}
