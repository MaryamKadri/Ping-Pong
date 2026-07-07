import * as THREE from 'three';

export function buildBeachFurniture(scene) {
    const furnitureGroup = new THREE.Group();

    // 1. دالة بناء كرسي الشاطئ المعدلة (مع إضافة 4 أرجل خشبية)
    function createBeachChair(color) {
        const chair = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 });
        const legMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 }); // خشب للأرجل

        // قاعدة الكرسي الأساسية
        const seatGeo = new THREE.BoxGeometry(1.4, 0.15, 2.6);
        const seat = new THREE.Mesh(seatGeo, mat);
        seat.position.set(0, 0.1, 0);
        seat.castShadow = true;
        chair.add(seat);

        // مسند الظهر المائل
        const backGeo = new THREE.BoxGeometry(1.4, 0.15, 1.4);
        const back = new THREE.Mesh(backGeo, mat);
        back.position.set(0, 0.6, 1.0);
        back.rotation.x = -Math.PI / 4; 
        back.castShadow = true;
        chair.add(back);

        // الوسادة البيضاء المريحة
        const pillowGeo = new THREE.BoxGeometry(1.2, 0.15, 0.35);
        const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const pillow = new THREE.Mesh(pillowGeo, pillowMat);
        pillow.position.set(0, 1.0, 1.4);
        pillow.rotation.x = -Math.PI / 4;
        chair.add(pillow);

        // 🛠 إضافة الأرجل الأربعة (لتملأ الفراغ الطائر تحت الكرسي)
        const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8); // أرجل اسطوانية بطول مناسب
        
        const legFrontLeft = new THREE.Mesh(legGeo, legMat);
        legFrontLeft.position.set(-0.6, -0.5, -1.1); // أمامي يسار
        legFrontLeft.castShadow = true;

        const legFrontRight = legFrontLeft.clone();
        legFrontRight.position.x = 0.6; // أمامي يمين

        const legBackLeft = legFrontLeft.clone();
        legBackLeft.position.z = 1.1; // خلفي يسار

        const legBackRight = legFrontRight.clone();
        legBackRight.position.z = 1.1; // خلفي يمين

        chair.add(legFrontLeft, legFrontRight, legBackLeft, legBackRight);

        return chair;
    }

    // 2. دالة بناء المظلة
    function createBeachUmbrella() {
        const umbrella = new THREE.Group();

        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.5, 12);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.7 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2.75;
        pole.castShadow = true;
        umbrella.add(pole);

        const topGroup = new THREE.Group();
        const segments = 12;
        const radius = 2.4; 
        const height = 0.8;

        for (let i = 0; i < segments; i++) {
            const segGeo = new THREE.ConeGeometry(radius, height, 4, 1, true, (i * Math.PI * 2) / segments, (Math.PI * 2) / segments);
            const segMat = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? 0xffffff : 0xd64545,
                roughness: 0.6,
                side: THREE.DoubleSide
            });
            const segment = new THREE.Mesh(segGeo, segMat);
            segment.castShadow = true;
            topGroup.add(segment);
        }
        topGroup.position.y = 5.2;
        umbrella.add(topGroup);

        return umbrella;
    }

    // 3. الطاولة الجانبية الصغيرة
    function createSideTable() {
        const tableGroup = new THREE.Group();
        const tableGeo = new THREE.BoxGeometry(0.7, 1.2, 0.7); // جعلنا الطاولة أطول لتصل للأرض
        const tableMat = new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.8 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = 0.0;
        table.castShadow = true;
        tableGroup.add(table);
        return tableGroup;
    }
    // 4. دالة بناء منطقة التدريب
    function createTrainingZone() {
        const zoneGroup = new THREE.Group();
        // أ) صندوق الكرات الخشبي
        const boxContainer = new THREE.Group();
        const boxGeo = new THREE.BoxGeometry(2.0, 0.8, 2.0);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
        const outerBox = new THREE.Mesh(boxGeo, boxMat);
        outerBox.position.y = 0.4;
        outerBox.castShadow = true;
        boxContainer.add(outerBox);

        const ballGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                const ball = new THREE.Mesh(ballGeo, ballMat);
                ball.position.set(x * 0.25, 0.75, z * 0.25);
                boxContainer.add(ball);
            }
        }
        boxContainer.position.set(-2, 0, 4);
        zoneGroup.add(boxContainer);

        // ب) الفرشات الرياضية الملونة المصفوفة
        const matColors = [0x2d3748, 0x48bb78, 0xed8936]; 
        matColors.forEach((col, index) => {
            const matGeo = new THREE.BoxGeometry(3.0, 0.15, 3.8);
            const gymMatMaterial = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });
            const matMesh = new THREE.Mesh(matGeo, gymMatMaterial);
            matMesh.position.set(3, 0.075 + (index * 0.16), 4); 
            matMesh.receiveShadow = true;
            zoneGroup.add(matMesh);
        });

        // ج) الأثقال الحديدية الكبيرة (Barbell)
        const barbell = new THREE.Group();
        const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8);
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.8, roughness: 0.2 });
        const bar = new THREE.Mesh(barGeo, ironMat);
        bar.rotation.z = Math.PI / 2;
        barbell.add(bar);

        const weightGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12);
        const leftWeight = new THREE.Mesh(weightGeo, ironMat);
        leftWeight.position.x = -1.0;
        leftWeight.rotation.z = Math.PI / 2;
        const rightWeight = leftWeight.clone();
        rightWeight.position.x = 1.0;
        barbell.add(leftWeight, rightWeight);
        
        barbell.position.set(3, 0.4, 0);
        zoneGroup.add(barbell);

        return zoneGroup;
    }

    // ════════════════════════════════════════════════════════════════
    //  إحداثيات التموضع الثابتة والمرفوعة بالأرجل
    // ════════════════════════════════════════════════════════════════
    
    // وضعنا X = -15 لتقترب الكراسي قليلاً وتظهر أمام النخلات المبعدة
    const beachPositions = [
        { x: -12.5, z: -15, color: 0xe67e22 }, 
        { x: -12.5, z: -7,  color: 0x2ecc71 }, 
        { x: -12.5, z: 1,   color: 0x9b59b6 }, 
        { x: -12.5, z: 9,   color: 0xe74c3c }, 
        { x: -12.5, z: 17,  color: 0xf1c40f }  
    ];

    beachPositions.forEach((pos) => {
        const setGroup = new THREE.Group();
        
        const chair = createBeachChair(pos.color);
        chair.position.set(0, 0, 0);
        chair.rotation.y = -Math.PI / 2; // الكرسي ينظر للطاولة

        const umbrella = createBeachUmbrella();
        umbrella.position.set(1.5, -1.8, 1.2); // المظلة مغروسة لأسفل قليلاً لتثبت

        const table = createSideTable();
        table.position.set(-1.0, -0.4, -1.0); // الطاولة ملامسة للأرض

        setGroup.add(chair, umbrella, table);
        setGroup.position.set(pos.x, 1.2, pos.z); // الارتفاع الذهبي المناسب للأرجل الجديدة
        furnitureGroup.add(setGroup);
    });

    // وضع منطقة التمارين فوق سطح الخشب تماماً
    const trainingZone = createTrainingZone();
    trainingZone.position.set(10, 0, 10); 
    furnitureGroup.add(trainingZone);

    scene.add(furnitureGroup);
    return furnitureGroup;
}