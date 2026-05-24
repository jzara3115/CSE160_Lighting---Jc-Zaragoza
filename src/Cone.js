class Cone {
    constructor(){
        this.type='cone';
        this.color = [1, 1, 1, 1];
        this.matrix = new Matrix4();
        this.segments = 24;
    }

    render() {
        var rgba = this.color;

        gl.uniform1i(u_whichTexture, -2);
        gl.uniform1f(u_texColorWeight, 0.0);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.matrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        var segments = Math.max(3, Number(this.segments));
        var angleStep = 360 / segments;

        for (var angle = 0; angle < 360; angle += angleStep) {
            var rad1 = angle * Math.PI / 180;
            var rad2 = (angle + angleStep) * Math.PI / 180;

            var x1 = 0.5 * Math.cos(rad1);
            var z1 = 0.5 * Math.sin(rad1);
            var x2 = 0.5 * Math.cos(rad2);
            var z2 = 0.5 * Math.sin(rad2);
            var n1 = this.getSideNormal(x1, z1);
            var n2 = this.getSideNormal(x2, z2);
            var nTop = this.getSideNormal((x1 + x2) / 2, (z1 + z2) / 2);

            // side
            drawTriangle3DUVNormal(
                [x1, 0, z1,  x2, 0, z2,  0, 1, 0],
                [0,0, 1,0, .5,1],
                [n1[0],n1[1],n1[2],  n2[0],n2[1],n2[2],  nTop[0],nTop[1],nTop[2]]
            );

            // base
            drawTriangle3DUVNormal(
                [0, 0, 0,  x2, 0, z2,  x1, 0, z1],
                [0.5,0.5, 1,1, 0,1],
                [0,-1,0, 0,-1,0, 0,-1,0]
            );
        }
    }

    getSideNormal(x, z) {
        var normal = new Vector3([x, 0.25, z]);
        normal.normalize();
        return normal.elements;
    }
}
