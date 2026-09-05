import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.min.js";
import { raySphereDistance, pointBehindSphere } from "../orbit-math.mjs";

test("Earth does not occlude a foreground logo, but does occlude a rear logo", () => {
  const camera = { x: 0, y: 0, z: 10 }, earth = { x: 0, y: 0, z: 0 };
  assert.equal(pointBehindSphere(camera, { x: 0, y: 0, z: 3 }, earth, 2), false);
  assert.equal(pointBehindSphere(camera, { x: 0, y: 0, z: -3 }, earth, 2), true);
  assert.equal(pointBehindSphere(camera, { x: 4, y: 0, z: -3 }, earth, 2), false);
  assert.equal(raySphereDistance(camera, { x: 0, y: 0, z: 1 }, earth, 2), Infinity);
});

test("analytic depth agrees with Three.js ray/sphere across 360-degree camera angles and all four orbits", () => {
  const center = new THREE.Vector3(31, -17, 12), sphere = new THREE.Sphere(center, 52);
  const ray = new THREE.Ray(), result = new THREE.Vector3();
  let checks = 0;
  for (let tilt = -80; tilt <= 80; tilt += 20) for (let yaw = 0; yaw < 360; yaw += 15) {
    const camera = new THREE.Vector3().setFromSphericalCoords(600, (90-tilt)*Math.PI/180, yaw*Math.PI/180).add(center);
    for (const radius of [135, 180, 222, 262]) for (let phase = 0; phase < 360; phase += 3) {
      const point = new THREE.Vector3(Math.cos(phase*Math.PI/180)*radius, Math.sin(phase*Math.PI/180)*radius*.2, Math.sin(phase*Math.PI/180)*radius).add(center);
      ray.set(camera, point.clone().sub(camera).normalize());
      const hit = ray.intersectSphere(sphere, result);
      const expected = Boolean(hit && camera.distanceTo(hit) < camera.distanceTo(point) - .001);
      assert.equal(pointBehindSphere(camera, point, center, sphere.radius), expected);
      checks++;
    }
  }
  assert.equal(checks, 103680);
});
