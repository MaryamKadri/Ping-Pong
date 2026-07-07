import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function buildPalmTrees(scene) {
    const palmGroup = new THREE.Group(); 
    const loader = new GLTFLoader();

    loader.load('palm_tree.glb', (gltf) => {
        const basePalm = gltf.scene;

        basePalm.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

 for (let i = 0; i < 14; i++) {
    const palmClone = basePalm.clone();
    
    // 1. تقريب الأشجار من جوانب المنصة (محور Z)
    // جعلناها 16 و -16 بدلاً من 25 لتقترب الصفوف جداً من حواف الخشب
    const isRightSide = i < 7;
    const z = isRightSide ? 25 : -25; 
    
    // 2. التوزيع الطولي على الرمل (محور X)
    // جعلنا البداية من -5 لتبدأ أول شجرة من عند زاوية المنصة الخلفية تماماً وتدخل في عمق الرمل
    const indexOnSide = i % 7;
    const x = -5 - (indexOnSide * 5.5); 
    
    // 3. ضبط الارتفاع (Y) لضمان ثباتها على الرمل
    const y = 0.2; 
    
    palmClone.position.set(x, y, z); 
    
    // 4. تكبير حجم الشجر ليصبح ضخماً وواضحاً (Scale)
    // زدنا الحجم ليتراوح بين 2.8 و 3.5 ليعطي مظهراً طبيعياً وقريباً
    const scale = 2.8 + Math.random() * 0.7;
    palmClone.scale.setScalar(scale);
    
    // تدوير الشجر بشكل عشوائي
    palmClone.rotation.y = Math.random() * Math.PI * 2; 
    
    palmGroup.add(palmClone);
}

        
    }, undefined, (error) => {
        console.error('Error loading palm tree:', error);
    });

    scene.add(palmGroup);
    return palmGroup; 
}