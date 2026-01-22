// AI 스타일 코치 - 메인 스크립트

// DOM 요소
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loadingEl = document.getElementById('loading');
const videoContainer = document.getElementById('video-container');
const startBtn = document.getElementById('start-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const resultsEl = document.getElementById('results');
const bodyResultEl = document.getElementById('body-result');
const colorResultEl = document.getElementById('color-result');
const colorPaletteEl = document.getElementById('color-palette');

// 모델 변수
let poseDetector = null;
let faceMeshDetector = null;
let isStreaming = false;
let animationId = null;

// 초기화
async function init() {
    try {
        await loadModels();
        loadingEl.classList.add('hidden');
        videoContainer.classList.remove('hidden');
        startBtn.disabled = false;
    } catch (error) {
        console.error('모델 로드 실패:', error);
        loadingEl.innerHTML = `
            <p style="color: red;">모델 로드에 실패했습니다.</p>
            <p>${error.message}</p>
        `;
    }
}

// AI 모델 로드
async function loadModels() {
    // TensorFlow.js 백엔드 설정
    await tf.setBackend('webgl');
    await tf.ready();

    // BlazePose 모델 로드 (체형 분석용)
    poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        {
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
            modelType: 'full'
        }
    );

    // FaceMesh 모델 로드 (퍼스널 컬러 분석용)
    faceMeshDetector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
            refineLandmarks: true
        }
    );

    console.log('모델 로드 완료');
}

// 웹캠 시작
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            isStreaming = true;
            startBtn.textContent = '카메라 중지';
            analyzeBtn.disabled = false;
            detectPose();
        };
    } catch (error) {
        console.error('카메라 접근 실패:', error);
        alert('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
}

// 카메라 중지
function stopCamera() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    isStreaming = false;
    startBtn.textContent = '카메라 시작';
    analyzeBtn.disabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 실시간 포즈 감지 및 시각화
async function detectPose() {
    if (!isStreaming) return;

    try {
        // 포즈 감지
        const poses = await poseDetector.estimatePoses(video);

        // 캔버스 클리어
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 포즈 그리기
        if (poses.length > 0) {
            drawPose(poses[0]);
        }
    } catch (error) {
        console.error('포즈 감지 오류:', error);
    }

    animationId = requestAnimationFrame(detectPose);
}

// 포즈 시각화
function drawPose(pose) {
    const keypoints = pose.keypoints;

    // 연결선 정의 (BlazePose)
    const connections = [
        [11, 12], // 어깨
        [11, 13], [13, 15], // 왼팔
        [12, 14], [14, 16], // 오른팔
        [11, 23], [12, 24], // 몸통
        [23, 24], // 골반
        [23, 25], [25, 27], // 왼다리
        [24, 26], [26, 28]  // 오른다리
    ];

    // 연결선 그리기
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;

    connections.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];

        if (kp1.score > 0.3 && kp2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.stroke();
        }
    });

    // 키포인트 그리기
    keypoints.forEach((kp, index) => {
        if (kp.score > 0.3) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

// 전체 분석 실행
async function analyze() {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '분석 중...';

    try {
        // 포즈 분석
        const poses = await poseDetector.estimatePoses(video);
        let bodyType = '분석 불가';

        if (poses.length > 0) {
            bodyType = analyzeBodyType(poses[0]);
        }

        // 얼굴 분석
        const faces = await faceMeshDetector.estimateFaces(video);
        let colorType = '분석 불가';
        let palette = [];

        if (faces.length > 0) {
            const colorResult = analyzePersonalColor(faces[0]);
            colorType = colorResult.type;
            palette = colorResult.palette;
        }

        // 결과 표시
        displayResults(bodyType, colorType, palette);

    } catch (error) {
        console.error('분석 오류:', error);
        alert('분석 중 오류가 발생했습니다.');
    }

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '분석하기';
}

// 체형 분석
function analyzeBodyType(pose) {
    const keypoints = pose.keypoints;

    // 어깨 좌표 (11: 왼쪽 어깨, 12: 오른쪽 어깨)
    const leftShoulder = keypoints[11];
    const rightShoulder = keypoints[12];

    // 골반 좌표 (23: 왼쪽 골반, 24: 오른쪽 골반)
    const leftHip = keypoints[23];
    const rightHip = keypoints[24];

    // 신뢰도 체크
    if (leftShoulder.score < 0.5 || rightShoulder.score < 0.5 ||
        leftHip.score < 0.5 || rightHip.score < 0.5) {
        return '포즈를 정확히 인식할 수 없습니다. 전신이 보이도록 서주세요.';
    }

    // 어깨 너비 계산
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);

    // 골반 너비 계산
    const hipWidth = Math.abs(rightHip.x - leftHip.x);

    // 비율 계산
    const ratio = shoulderWidth / hipWidth;

    // 체형 판별
    if (ratio > 1.15) {
        return '역삼각형 체형 (Inverted Triangle) - 어깨가 넓고 골반이 좁은 타입';
    } else if (ratio < 0.9) {
        return '삼각형 체형 (Triangle/Pear) - 골반이 어깨보다 넓은 타입';
    } else {
        return '직사각형 체형 (Rectangle) - 어깨와 골반이 비슷한 타입';
    }
}

// 퍼스널 컬러 분석
function analyzePersonalColor(face) {
    const keypoints = face.keypoints;

    // 볼 영역의 랜드마크 인덱스 (MediaPipe FaceMesh 기준)
    // 왼쪽 볼: 50, 101, 118, 119
    // 오른쪽 볼: 280, 330, 347, 348
    const cheekIndices = [50, 101, 118, 119, 280, 330, 347, 348];

    // 캔버스에서 피부색 샘플링
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(video, 0, 0);

    let totalR = 0, totalG = 0, totalB = 0;
    let sampleCount = 0;

    cheekIndices.forEach(index => {
        const point = keypoints[index];
        if (point) {
            const x = Math.round(point.x);
            const y = Math.round(point.y);

            // 주변 픽셀 샘플링 (5x5 영역)
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    const px = x + dx;
                    const py = y + dy;

                    if (px >= 0 && px < tempCanvas.width && py >= 0 && py < tempCanvas.height) {
                        const imageData = tempCtx.getImageData(px, py, 1, 1).data;
                        totalR += imageData[0];
                        totalG += imageData[1];
                        totalB += imageData[2];
                        sampleCount++;
                    }
                }
            }
        }
    });

    if (sampleCount === 0) {
        return { type: '얼굴을 인식할 수 없습니다.', palette: [] };
    }

    // 평균 RGB
    const avgR = totalR / sampleCount;
    const avgG = totalG / sampleCount;
    const avgB = totalB / sampleCount;

    // RGB to HSV 변환
    const hsv = rgbToHsv(avgR, avgG, avgB);

    // 톤 판별
    // 웜톤: 노란/주황 계열 (Hue: 15-45도)
    // 쿨톤: 분홍/파란 계열 (Hue: 300-360도 또는 0-15도)
    const hue = hsv.h;
    const saturation = hsv.s;

    let toneType = '';
    let palette = [];

    if ((hue >= 15 && hue <= 50) || (saturation < 0.3 && avgR > avgB)) {
        toneType = '웜톤 (Warm Tone)';
        palette = ['#FFE4B5', '#DEB887', '#CD853F', '#D2691E', '#8B4513'];
    } else {
        toneType = '쿨톤 (Cool Tone)';
        palette = ['#E6E6FA', '#DDA0DD', '#DA70D6', '#BA55D3', '#9932CC'];
    }

    // 명도에 따른 세부 분류
    const brightness = (avgR + avgG + avgB) / 3;

    if (brightness > 180) {
        toneType += ' - 라이트(봄/여름)';
    } else {
        toneType += ' - 딥(가을/겨울)';
    }

    return { type: toneType, palette };
}

// RGB to HSV 변환
function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
        switch (max) {
            case r:
                h = 60 * ((g - b) / diff % 6);
                break;
            case g:
                h = 60 * ((b - r) / diff + 2);
                break;
            case b:
                h = 60 * ((r - g) / diff + 4);
                break;
        }
    }

    if (h < 0) h += 360;

    return { h, s, v };
}

// 결과 표시
function displayResults(bodyType, colorType, palette) {
    bodyResultEl.textContent = bodyType;
    colorResultEl.textContent = colorType;

    // 컬러 팔레트 표시
    colorPaletteEl.innerHTML = '';
    palette.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        colorPaletteEl.appendChild(swatch);
    });

    resultsEl.classList.remove('hidden');
}

// 이벤트 리스너
startBtn.addEventListener('click', () => {
    if (isStreaming) {
        stopCamera();
    } else {
        startCamera();
    }
});

analyzeBtn.addEventListener('click', analyze);

// 앱 시작
init();
