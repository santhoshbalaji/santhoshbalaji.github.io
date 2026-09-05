// Sphere intersection avoids testing thousands of Earth triangles every frame.
// Inputs are plain vectors so the exact visibility math is unit-testable without WebGL.
export function raySphereDistance(origin, direction, center, radius) {
  const x = origin.x - center.x;
  const y = origin.y - center.y;
  const z = origin.z - center.z;
  const b = x * direction.x + y * direction.y + z * direction.z;
  const c = x * x + y * y + z * z - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) return Infinity;
  const root = Math.sqrt(discriminant);
  const near = -b - root;
  const far = -b + root;
  return far < 0 ? Infinity : Math.max(0, near);
}

export function pointBehindSphere(origin, point, center, radius) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dz = point.z - origin.z;
  const distance = Math.hypot(dx, dy, dz);
  if (!distance) return false;
  const hit = raySphereDistance(origin, { x: dx / distance, y: dy / distance, z: dz / distance }, center, radius);
  return hit < distance - 0.001;
}
