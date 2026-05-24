// Camera.js
// This camera stores the view/projection matrices and gives movement functions for the world.
class Camera {
  constructor() {
    this.fov = 60;

    // Assignment defaults. The camera starts at the origin and looks down -Z.
    this.eye = new Vector3([0, 0, 0]);
    this.at = new Vector3([0, 0, -1]);
    this.up = new Vector3([0, 1, 0]);

    this.speed = 0.2;
    this.alpha = 5;
    this.pitch = 0;
    this.maxPitch = 89;

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();

    this.updateViewMatrix();
    this.updateProjectionMatrix();
  }

  updateViewMatrix() {
    var e = this.eye.elements;
    var a = this.at.elements;
    var u = this.up.elements;

    this.viewMatrix.setLookAt(
      e[0], e[1], e[2],
      a[0], a[1], a[2],
      u[0], u[1], u[2]
    );
  }

  updateProjectionMatrix() {
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
  }

  moveForward(speed = this.speed) {
    // f = at - eye
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    f.normalize();
    f.mul(speed);

    this.eye.add(f);
    this.at.add(f);
    this.updateViewMatrix();
  }

  moveBackwards(speed = this.speed) {
    // b = eye - at
    let b = new Vector3();
    b.set(this.eye);
    b.sub(this.at);
    b.normalize();
    b.mul(speed);

    this.eye.add(b);
    this.at.add(b);
    this.updateViewMatrix();
  }

  moveLeft(speed = this.speed) {
    // f = at - eye
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);

    // s = up x f
    let s = Vector3.cross(this.up, f);
    s.normalize();
    s.mul(speed);

    this.eye.add(s);
    this.at.add(s);
    this.updateViewMatrix();
  }

  moveRight(speed = this.speed) {
    // f = at - eye
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);

    // s = f x up
    let s = Vector3.cross(f, this.up);
    s.normalize();
    s.mul(speed);

    this.eye.add(s);
    this.at.add(s);
    this.updateViewMatrix();
  }

  panLeft(alpha = this.alpha) {
    // f = at - eye
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);

    var u = this.up.elements;
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(alpha, u[0], u[1], u[2]);

    let fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateViewMatrix();
  }

  panRight(alpha = this.alpha) {
    // Same as panLeft, but rotate by -alpha.
    this.panLeft(-alpha);
  }

  pitchUp(alpha = this.alpha) {
    // Look up/down by rotating the forward vector around the camera's right vector.
    // I clamp this so the camera cannot flip upside down.
    var nextPitch = this.pitch + alpha;
    if (nextPitch > this.maxPitch) {
      alpha = this.maxPitch - this.pitch;
      this.pitch = this.maxPitch;
    } else if (nextPitch < -this.maxPitch) {
      alpha = -this.maxPitch - this.pitch;
      this.pitch = -this.maxPitch;
    } else {
      this.pitch = nextPitch;
    }

    if (Math.abs(alpha) < 0.0001) {
      return;
    }

    // f = at - eye
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);

    // right = f x up
    let right = Vector3.cross(f, this.up);
    right.normalize();
    var r = right.elements;

    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(alpha, r[0], r[1], r[2]);

    let fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateViewMatrix();
  }

  pitchDown(alpha = this.alpha) {
    this.pitchUp(-alpha);
  }

}
