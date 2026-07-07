import * as THREE from 'three';

export function buildLights(scene) {
  // 1. تقليل الإضاءة المحيطية جداً، الـ HDR سيتكفل بالباقي
  const ambient = new THREE.AmbientLight(0xffffff, 0.05);
  scene.add(ambient);

  // 2. تقليل قوة الـ HemisphereLight
  const hemiLight = new THREE.HemisphereLight(0x9fdcff, 0xf2deb3, 0.2);
  scene.add(hemiLight);

  // 3. تقليل إضاءة الشمس المباشرة (السبب الرئيسي للسطوع العالي)
  const dirLight = new THREE.DirectionalLight(0xfffdfa, 0.8); // تم التخفيض من 1.8 إلى 0.8
  dirLight.position.set(-20, 25, -10);
  dirLight.castShadow = true;

  dirLight.shadow.mapSize.set(2048, 2048); 
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.top = 25;
  dirLight.shadow.camera.bottom = -25;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.bias = -0.0005; 

  scene.add(dirLight);

  // 4. إضعاف ضوء الارتداد
  const fillLight = new THREE.DirectionalLight(0xbfdfff, 0.1); // تم التخفيض من 0.2 إلى 0.1
  fillLight.position.set(20, 15, 10); 
  scene.add(fillLight);

  return { ambient, hemiLight, dirLight, fillLight };
}