class Cube {
    constructor(){
        this.type='cube';
        this.color = [1, 1, 1, 1];
        this.textureNum = -2;
        this.texColorWeight = 0.0;
        this.matrix = new Matrix4();
    }

    render() {
        var rgba = this.color;

        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform1f(u_texColorWeight, this.texColorWeight);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.matrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        //front
        drawTriangle3DUVNormal([0.0,0.0,0.0,   1.0, 1.0, 0.0,     1.0, 0.0, 0.0], [0,0, 1,1, 1,0], [0,0,-1, 0,0,-1, 0,0,-1]);
        drawTriangle3DUVNormal([0.0,0.0,0.0,   0.0, 1.0, 0.0,     1.0, 1.0, 0.0], [0,0, 0,1, 1,1], [0,0,-1, 0,0,-1, 0,0,-1]);

        //back
        drawTriangle3DUVNormal([0.0,0.0,1.0,   1.0, 1.0, 1.0,     1.0, 0.0, 1.0], [0,0, 1,1, 1,0], [0,0,1, 0,0,1, 0,0,1]);
        drawTriangle3DUVNormal([0.0,0.0,1.0,   0.0, 1.0, 1.0,     1.0, 1.0, 1.0], [0,0, 0,1, 1,1], [0,0,1, 0,0,1, 0,0,1]);

        gl.uniform4f(u_FragColor, rgba[0]*.8, rgba[1]*.8, rgba[2]*.8, rgba[3]);
        //bottom
        drawTriangle3DUVNormal([0.0,0.0,0.0,   1.0, 0.0, 0.0,     1.0, 0.0, 1.0], [0,0, 1,0, 1,1], [0,-1,0, 0,-1,0, 0,-1,0]);
        drawTriangle3DUVNormal([0.0,0.0,0.0,   1.0, 0.0, 1.0,     0.0, 0.0, 1.0], [0,0, 1,1, 0,1], [0,-1,0, 0,-1,0, 0,-1,0]);


        //top
        drawTriangle3DUVNormal([0.0,1.0,0.0,   1.0, 1.0, 0.0,     1.0, 1.0, 1.0], [0,0, 1,0, 1,1], [0,1,0, 0,1,0, 0,1,0]);
        drawTriangle3DUVNormal([0.0,1.0,0.0,   1.0, 1.0, 1.0,     0.0, 1.0, 1.0], [0,0, 1,1, 0,1], [0,1,0, 0,1,0, 0,1,0]);

        gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
        //left
        drawTriangle3DUVNormal([0.0,1.0,1.0,   0.0, 1.0, 0.0,     0.0, 0.0, 0.0], [0,1, 1,1, 1,0], [-1,0,0, -1,0,0, -1,0,0]);
        drawTriangle3DUVNormal([0.0,1.0,1.0,   0.0, 0.0, 0.0,     0.0, 0.0, 1.0], [0,1, 1,0, 0,0], [-1,0,0, -1,0,0, -1,0,0]);

        //right
        drawTriangle3DUVNormal([1.0,1.0,1.0,   1.0, 1.0, 0.0,     1.0, 0.0, 0.0], [0,1, 1,1, 1,0], [1,0,0, 1,0,0, 1,0,0]);
        drawTriangle3DUVNormal([1.0,1.0,1.0,   1.0, 0.0, 0.0,     1.0, 0.0, 1.0], [0,1, 1,0, 0,0], [1,0,0, 1,0,0, 1,0,0]);

    }
}
