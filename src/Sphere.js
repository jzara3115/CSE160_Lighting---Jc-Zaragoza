class Sphere {
    constructor(){
        this.type='sphere';
        this.color = [1, 1, 1, 1];
        this.textureNum = -2;
        this.texColorWeight = 0.0;
        this.matrix = new Matrix4();
        this.segments = 12;
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

        var segments = Math.max(6, Number(this.segments));
        var angleStep = Math.PI / segments;

        for (var t = 0; t < Math.PI; t += angleStep) {
            for (var r = 0; r < Math.PI * 2; r += angleStep) {
                var p1 = this.getSpherePoint(t, r);
                var p2 = this.getSpherePoint(t + angleStep, r);
                var p3 = this.getSpherePoint(t, r + angleStep);
                var p4 = this.getSpherePoint(t + angleStep, r + angleStep);

                drawTriangle3DUVNormal(
                    [p1[0],p1[1],p1[2],  p2[0],p2[1],p2[2],  p4[0],p4[1],p4[2]],
                    [0,0, 0,1, 1,1],
                    [p1[0],p1[1],p1[2],  p2[0],p2[1],p2[2],  p4[0],p4[1],p4[2]]
                );

                drawTriangle3DUVNormal(
                    [p1[0],p1[1],p1[2],  p4[0],p4[1],p4[2],  p3[0],p3[1],p3[2]],
                    [0,0, 1,1, 1,0],
                    [p1[0],p1[1],p1[2],  p4[0],p4[1],p4[2],  p3[0],p3[1],p3[2]]
                );
            }
        }
    }

    getSpherePoint(theta, phi) {
        var x = Math.sin(theta) * Math.cos(phi);
        var y = Math.cos(theta);
        var z = Math.sin(theta) * Math.sin(phi);

        return [x, y, z];
    }
}
