import * as THREE from 'three';

export function buildFloor(scene) {
  const textureLoader = new THREE.TextureLoader();

  // ════════════════════════════════════════════════════════════════
  // 1. أرضية الرمل الذهبي
  // ════════════════════════════════════════════════════════════════
  const sandGeo = new THREE.PlaneGeometry(2000, 2000);
  const sandMat = new THREE.MeshStandardMaterial({ 
    color: 0x9d7249,       
    roughness: 0.8,
    metalness: 0.0,       
    flatShading: true      
  });
  
  const sandFloor = new THREE.Mesh(sandGeo, sandMat);
  sandFloor.rotation.x = -Math.PI / 2;
  sandFloor.position.set(-980, -1.2, 0); 
  sandFloor.receiveShadow = true;
  scene.add(sandFloor);

  // ════════════════════════════════════════════════════════════════
  // 2. المنصة الخشبية (أبعادها المحدثة 38 عمق)
  // ════════════════════════════════════════════════════════════════
  const woodTexture = textureLoader.load('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(10, 6);
  woodTexture.colorSpace = THREE.SRGBColorSpace;

  const deckGeo = new THREE.BoxGeometry(35, 2.5, 38);
  const deckMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.4 });
  const woodenDeck = new THREE.Mesh(deckGeo, deckMat);
  
  woodenDeck.position.set(2.5, -1.25, 0); 
  woodenDeck.receiveShadow = true;
  woodenDeck.castShadow = true;
  scene.add(woodenDeck);

  // 3. بناء أعمدة التثبيت الخشبية
  buildBeachPillars(scene);

  // 4. بناء حبل الحماية الجمالي
  buildSeaRailing(scene);

  // 5. بناء السور المحيط بالمنصة
  buildSurroundingFence(scene);

  // 6. بناء وتوزيع الإضافات - التموضع الصحيح بالخلف على اليمين
  buildExtraFurniture(scene);
}

function buildBeachPillars(scene) {
  const pillarGeo = new THREE.CylinderGeometry(0.25, 0.25, 5, 16);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x22150c, roughness: 0.8 });

  const positions = [
    [20.0, -2.5, -9.8],
    [20.0, -2.5, 0],
    [20.0, -2.5, 9.8]
  ];

  positions.forEach(([x, y, z]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, y, z);
    pillar.castShadow = true;
    scene.add(pillar);
  });
}

function buildSeaRailing(scene) {
  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.7 });

  for (let z = -9.5; z <= 9.5; z += 4.75) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(19.8, 0.6, z); 
    post.castShadow = true;
    scene.add(post);
  }
}

function buildSurroundingFence(scene) {
  const fenceGroup = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a431d, roughness: 0.9 });

  function createFenceUnit() {
    const unit = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8);
    
    const post1 = new THREE.Mesh(postGeo, woodMat);
    post1.position.set(-1, 0.65, 0);
    post1.castShadow = true;
    
    const post2 = post1.clone();
    post2.position.x = 1;
    unit.add(post1, post2);

    const railGeo = new THREE.BoxGeometry(2, 0.08, 0.04);
    const railTop = new THREE.Mesh(railGeo, woodMat);
    railTop.position.set(0, 1.0, 0);
    railTop.castShadow = true;

    const railBottom = railTop.clone();
    railBottom.position.y = 0.4;
    unit.add(railTop, railBottom);

    return unit;
  }

  // أ) السور الخلفي - مفتوح خلف الكراسي والمظلات (يبدأ من X = 0 إلى اليمين فقط)
  for (let x = 0; x <= 19; x += 2) {
    const segment = createFenceUnit();
    segment.position.set(x, 0.0, -18.9);
    fenceGroup.add(segment);
  }
  
  // ب) السور الجانبي الأيسر - مغلق بالكامل لحماية طرف الرمل (من Z = -18 إلى 18)
  for (let z = -18; z <= 18; z += 2) {
    const segment = createFenceUnit();
    segment.rotation.y = Math.PI / 2;
    segment.position.set(-14.9, 0.0, z);
    fenceGroup.add(segment);
  }

  // ج) السور الجانبي الأيمن - مغلق بالكامل لحماية طرف البحر (من Z = -18 إلى 18)
  for (let z = -18; z <= 18; z += 2) {
    const segment = createFenceUnit();
    segment.rotation.y = Math.PI / 2;
    segment.position.set(19.9, 0.0, z);
    fenceGroup.add(segment);
  }

  // د) السور الأمامي المحدث 🆕 - تم تفعيله وإغلاقه بالكامل لحماية الحافة الأمامية المكشوفة (من X = -14 إلى 19)
  for (let x = -14; x <= 19; x += 2) {
    const segment = createFenceUnit();
    segment.position.set(x, 0.0, 18.9); // تم وضعه على الحافة الأمامية المقابلة Z = 18.9
    fenceGroup.add(segment);
  }

  scene.add(fenceGroup);
}
function buildExtraFurniture(scene) {
  const extraGroup = new THREE.Group();

  // ==========================================
  // 1. المقعد الخشبي (Wooden Bench)
  // تم إزاحته قليلاً لليسار بالخلف (X = -6, Z = -15) ليفسح المجال للألعاب على يمينه
  // ==========================================
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6e3c1a, roughness: 0.8 });
  const bench = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, 1.0), benchMat);
  seat.position.set(0, 0.5, 0);
  seat.castShadow = true;
  bench.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.7, 0.12), benchMat);
  back.position.set(0, 1.0, -0.45);
  back.castShadow = true;
  bench.add(back);

  const legGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
  [[-1.6, 0.25, 0.4], [1.6, 0.25, 0.4], [-1.6, 0.25, -0.4], [1.6, 0.25, -0.4]].forEach(pos => {
    const leg = new THREE.Mesh(legGeo, benchMat);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    bench.add(leg);
  });
  bench.position.set(-6.0, 0.0, -15); 
  extraGroup.add(bench);


  // ==========================================
  // 👉 الألعاب وصندوق الكرات: بنفس صف الكرسي الخشبي (Z = -15) ولكن على الـيـمـيـن (X موجبة)
  // ==========================================

  // 1. صندوق الكرات المرفوع (Ball Box) -> يقع مباشرة على يمين الكرسي بالخلف (X = -1.5)
  const ballBoxGroup = new THREE.Group();
  const machineBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 }));
  machineBase.position.y = 0.4;
  machineBase.castShadow = true;
  const subBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.15, 1.3), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  subBase.position.y = 0.075;
  ballBoxGroup.add(machineBase, subBase);

  const boxContainer = new THREE.Group();
  const boxWallMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.7 });
  const boxFloor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 1.1), boxWallMat);
  boxFloor.position.y = 0.825;
  boxContainer.add(boxFloor);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.1), boxWallMat); leftWall.position.set(-0.525, 1.05, 0);
  const rightWall = leftWall.clone(); rightWall.position.x = 0.525;
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.05), boxWallMat); frontWall.position.set(0, 1.05, 0.525);
  const backWall = frontWall.clone(); backWall.position.z = -0.525;
  boxContainer.add(leftWall, rightWall, frontWall, backWall);
  ballBoxGroup.add(boxContainer);

  const ballGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  [[-0.3, 0.9, -0.3], [0.0, 0.9, -0.3], [0.3, 0.9, -0.3], [-0.2, 0.9, 0.0], [0.1, 0.9, 0.0], [0.3, 0.9, 0.2], [0.0, 1.0, 0.2], [0.1, 1.1, 0.0]].forEach(pos => {
    const bMesh = new THREE.Mesh(ballGeo, ballMat);
    bMesh.position.set(pos[0], pos[1], pos[2]);
    bMesh.castShadow = true;
    ballBoxGroup.add(bMesh);
  });
  ballBoxGroup.position.set(14, 0.0, -15); 
  extraGroup.add(ballBoxGroup);

  // 2. هيكل السلم الخشبي والألعاب الملحقة -> يأتي على يمين صندوق الكرات بالخلف (X = 3)
  const gymLadderStructure = new THREE.Group();
  const woodGymMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.7 });
  const frontLeftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 12), woodGymMat); frontLeftLeg.position.set(-1.2, 1.1, 0.5); frontLeftLeg.rotation.z = -0.2; frontLeftLeg.rotation.x = 0.2;
  const backLeftLeg = frontLeftLeg.clone(); backLeftLeg.position.z = -0.5; backLeftLeg.rotation.x = -0.2;
  const frontRightLeg = frontLeftLeg.clone(); frontRightLeg.position.x = 1.2; frontRightLeg.rotation.z = 0.2;
  const backRightLeg = backLeftLeg.clone(); backRightLeg.position.x = 1.2; backRightLeg.rotation.z = 0.2;
  gymLadderStructure.add(frontLeftLeg, backLeftLeg, frontRightLeg, backRightLeg);
  const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8);
  for (let yHeight = 0.4; yHeight <= 2.0; yHeight += 0.4) {
    const rungFront = new THREE.Mesh(rungGeo, woodGymMat); rungFront.rotation.z = Math.PI / 2; rungFront.position.set(0, yHeight, 0.4);
    const rungBack = rungFront.clone(); rungBack.position.z = -0.4;
    gymLadderStructure.add(rungFront, rungBack);
  }

  const bigBall = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.4 }));
  bigBall.position.set(-0.3, 0.4, 1.2); bigBall.castShadow = true;
  const rolledMat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 12), new THREE.MeshStandardMaterial({ color: 0x48bb78, roughness: 0.6 }));
  rolledMat.rotation.z = Math.PI / 2; rolledMat.position.set(0.5, 0.15, 1.2); rolledMat.castShadow = true;
  gymLadderStructure.add(bigBall, rolledMat);

  gymLadderStructure.position.set(9.0, 0.0, -15); 
  extraGroup.add(gymLadderStructure);


  // ==========================================
  // 👉 الطرف الأمامي المقابل (Z = 16.5)
  // (كولر الماء + الفرشات المكدسة + قاعدة الأثقال)
  // ==========================================

  // 1. كولر الماء (Water Cooler) -> بالأمام جهة اليمين (X = 15)
  const cooler = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16), new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 })); body.position.y = 0.55; body.castShadow = true;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6, roughness: 0.2 })); tank.position.y = 1.5; tank.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x1d4ed8 })); cap.position.y = 1.96;
  cooler.add(body, tank, cap);
  cooler.position.set(15.0, 0.0, 16.5); 
  extraGroup.add(cooler);

  // 2. الفرشات الرياضية المكدسة (Gym Mats Stack) -> بالأمام (X = 10)
  const matsStack = new THREE.Group();
  const matColors = [0x718096, 0x2f855a, 0x4a5568]; 
  matColors.forEach((color, index) => {
    const matMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 3.0), new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 }));
    matMesh.position.y = 0.075 + (index * 0.15); 
    matMesh.castShadow = true; matMesh.receiveShadow = true;
    matsStack.add(matMesh);
  });
  matsStack.position.set(10.0, 0.0, 16.5); 
  extraGroup.add(matsStack);
  // 3. قاعدة وحامل الأثقال والبار (Weights Setup) -> بالأمام (X = 5)
  const weightsGroup = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.2, metalness: 0.8 });
  const standMat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.5 });
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.8), standMat); standBase.position.y = 0.04; weightsGroup.add(standBase);
  const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12), standMat); leftPillar.position.set(-0.8, 0.4, 0);
  const rightPillar = leftPillar.clone(); rightPillar.position.x = 0.8; weightsGroup.add(leftPillar, rightPillar);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 12), metalMat); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.8, 0); bar.castShadow = true; weightsGroup.add(bar);
  const leftPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16), metalMat); leftPlate.rotation.z = Math.PI / 2; leftPlate.position.set(-0.9, 0.8, 0);
  const rightPlate = leftPlate.clone(); rightPlate.position.x = 0.9; weightsGroup.add(leftPlate, rightPlate);
  
  weightsGroup.position.set(5.0, 0.0, 16.5);
  extraGroup.add(weightsGroup);

  scene.add(extraGroup);
}