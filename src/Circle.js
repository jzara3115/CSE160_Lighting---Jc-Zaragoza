class Circle {
    constructor(){
        this.type='circle';
        this.position = [0, 0, 0];
        this.color = [1, 1, 1, 1];
        this.size = 10;
        this.segments = 12;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;
        var segments = Math.max(3, Number(this.segments));

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniform1f(u_Size, size);

        var radius = size / 200.0;
        var angleStep = 360 / segments;

        for (var angle = 0; angle < 360; angle += angleStep) {
            var rad1 = angle * Math.PI / 180;
            var rad2 = (angle + angleStep) * Math.PI / 180;

            var p1x = xy[0] + Math.cos(rad1) * radius;
            var p1y = xy[1] + Math.sin(rad1) * radius;
            var p2x = xy[0] + Math.cos(rad2) * radius;
            var p2y = xy[1] + Math.sin(rad2) * radius;

            drawTriangle([xy[0], xy[1], p1x, p1y, p2x, p2y]);
        }
    }
}
