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
const styleRecommendEl = document.getElementById('style-recommend');

// 모델 변수
let poseDetector = null;
let faceMeshDetector = null;
let isStreaming = false;
let animationId = null;

// ==========================================
// 스타일 추천 데이터베이스
// ==========================================

const STYLE_DATABASE = {
    bodyTypes: {
        inverted_triangle: {
            name: '역삼각형',
            description: '어깨가 넓고 골반이 좁은 타입',
            recommendations: [
                'V넥, 라운드넥 상의로 어깨 라인 부드럽게',
                'A라인 스커트/바지로 하체 볼륨 추가',
                '밝은 색상 하의로 시선 분산',
                '힙 포켓이 있는 바지 추천',
                '패드 없는 어깨 디자인'
            ],
            avoid: ['보트넥', '퍼프 소매', '어깨 패드'],
            icons: ['👔', '👖', '👗']
        },
        triangle: {
            name: '삼각형',
            description: '골반이 어깨보다 넓은 타입',
            recommendations: [
                '보트넥, 오프숄더로 어깨 라인 강조',
                '밝은 색상 상의로 시선 위로',
                '스트레이트/부츠컷 팬츠',
                'A라인 원피스',
                '디테일이 있는 상의'
            ],
            avoid: ['스키니진', '밝은 색상 하의', '펜슬 스커트'],
            icons: ['👚', '👗', '🧥']
        },
        rectangle: {
            name: '직사각형',
            description: '어깨와 골반이 비슷한 타입',
            recommendations: [
                '허리 벨트로 실루엣 강조',
                '페플럼 탑으로 곡선 연출',
                '랩 원피스/스커트',
                '크롭탑 + 하이웨이스트 조합',
                '레이어드 스타일링'
            ],
            avoid: ['박시한 실루엣', '일자 원피스'],
            icons: ['👗', '👠', '💃']
        },
        hourglass: {
            name: '모래시계',
            description: '어깨와 골반이 균형잡히고 허리가 잘록한 타입',
            recommendations: [
                '바디컨 드레스로 실루엣 강조',
                '허리라인 강조하는 벨트',
                '랩 스타일 상의',
                '하이웨이스트 하의',
                '피트된 재킷'
            ],
            avoid: ['박시한 옷', '허리를 가리는 스타일'],
            icons: ['👗', '💄', '✨']
        },
        oval: {
            name: '타원형',
            description: '중심부에 볼륨이 있는 타입',
            recommendations: [
                'V넥으로 시선 세로 분산',
                '세로 스트라이프 패턴',
                '엠파이어 라인 원피스',
                '플레어 하의',
                '롱 카디건/재킷'
            ],
            avoid: ['타이트한 옷', '가로 스트라이프', '짧은 상의'],
            icons: ['🧥', '👗', '🎀']
        }
    },

    personalColors: {
        spring_warm: {
            name: '봄 웜톤',
            description: '밝고 화사한 웜톤',
            palette: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#95E1D3', '#F38181'],
            colorNames: ['코랄', '레몬 옐로우', '피치', '아이보리', '살몬 핑크'],
            recommendations: [
                '피치, 코랄, 살몬 핑크',
                '밝은 오렌지, 골드',
                '아이보리, 카멜',
                '밝은 청록색'
            ],
            avoid: ['블랙', '순백색', '버건디', '네이비'],
            makeup: ['피치 블러셔', '코랄 립스틱', '브라운 아이섀도우'],
            icons: ['🌸', '🌷', '☀️']
        },
        summer_cool: {
            name: '여름 쿨톤',
            description: '부드럽고 우아한 쿨톤',
            palette: ['#DDA0DD', '#E6E6FA', '#B0C4DE', '#FFC0CB', '#98D8C8'],
            colorNames: ['라벤더', '로즈 핑크', '스카이 블루', '민트', '그레이'],
            recommendations: [
                '라벤더, 로즈 핑크',
                '소프트한 파스텔 톤',
                '쿨한 그레이',
                '연한 블루, 민트'
            ],
            avoid: ['오렌지', '머스타드', '카키', '골드'],
            makeup: ['로즈 블러셔', '베리 립스틱', '핑크 아이섀도우'],
            icons: ['💜', '🌊', '❄️']
        },
        autumn_warm: {
            name: '가을 웜톤',
            description: '깊고 풍부한 웜톤',
            palette: ['#D2691E', '#8B4513', '#CD853F', '#DAA520', '#556B2F'],
            colorNames: ['버건디', '머스타드', '카멜', '브라운', '올리브'],
            recommendations: [
                '머스타드, 카멜, 브라운',
                '버건디, 테라코타',
                '올리브 그린',
                '골드, 브론즈'
            ],
            avoid: ['파스텔 톤', '순백색', '형광색'],
            makeup: ['브릭 블러셔', '브라운 립스틱', '골드 아이섀도우'],
            icons: ['🍂', '🍁', '🌰']
        },
        winter_cool: {
            name: '겨울 쿨톤',
            description: '선명하고 강렬한 쿨톤',
            palette: ['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#FF00FF'],
            colorNames: ['블랙', '화이트', '레드', '로얄 블루', '핫 핑크'],
            recommendations: [
                '블랙 & 화이트 조합',
                '선명한 레드, 핫 핑크',
                '로얄 블루, 에메랄드',
                '실버 악세서리'
            ],
            avoid: ['오렌지', '베이지', '골드', '흐린 색상'],
            makeup: ['핑크 블러셔', '레드 립스틱', '실버 아이섀도우'],
            icons: ['❄️', '💎', '🖤']
        }
    }
};

// ==========================================
// 초기화 및 모델 로드
// ==========================================

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
            <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">다시 시도</button>
        `;
    }
}

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

// ==========================================
// 카메라 제어
// ==========================================

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
        alert('카메라에 접근할 수 없습니다. 브라우저 설정에서 카메라 권한을 확인해주세요.');
    }
}

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

// ==========================================
// 실시간 포즈 감지 및 시각화
// ==========================================

async function detectPose() {
    if (!isStreaming) return;

    try {
        const poses = await poseDetector.estimatePoses(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (poses.length > 0) {
            drawPose(poses[0]);
        }
    } catch (error) {
        console.error('포즈 감지 오류:', error);
    }

    animationId = requestAnimationFrame(detectPose);
}

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
    keypoints.forEach((kp) => {
        if (kp.score > 0.3) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

// ==========================================
// 분석 실행
// ==========================================

async function analyze() {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '분석 중...';
    resultsEl.classList.add('hidden');

    try {
        // 포즈 분석
        const poses = await poseDetector.estimatePoses(video);
        let bodyResult = { type: null, key: null };

        if (poses.length > 0) {
            bodyResult = analyzeBodyType(poses[0]);
        }

        // 얼굴 분석
        const faces = await faceMeshDetector.estimateFaces(video);
        let colorResult = { type: null, key: null };

        if (faces.length > 0) {
            colorResult = analyzePersonalColor(faces[0]);
        }

        // 결과 표시
        displayResults(bodyResult, colorResult);

    } catch (error) {
        console.error('분석 오류:', error);
        alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    }

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '분석하기';
}

// ==========================================
// 체형 분석 (고도화)
// ==========================================

function analyzeBodyType(pose) {
    const keypoints = pose.keypoints;

    // 주요 포인트 추출
    const leftShoulder = keypoints[11];
    const rightShoulder = keypoints[12];
    const leftHip = keypoints[23];
    const rightHip = keypoints[24];
    const leftKnee = keypoints[25];
    const rightKnee = keypoints[26];

    // 신뢰도 체크
    const minScore = 0.5;
    if (leftShoulder.score < minScore || rightShoulder.score < minScore ||
        leftHip.score < minScore || rightHip.score < minScore) {
        return {
            type: '포즈를 정확히 인식할 수 없습니다. 전신이 보이도록 서주세요.',
            key: null
        };
    }

    // 치수 계산
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const hipWidth = Math.abs(rightHip.x - leftHip.x);

    // 허리 위치 추정 (어깨와 골반 사이)
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const torsoHeight = Math.abs(hipMidY - shoulderMidY);

    // 비율 계산
    const shoulderHipRatio = shoulderWidth / hipWidth;

    // 체형 판별 로직 (5가지 체형)
    let bodyType = '';
    let bodyKey = '';

    if (shoulderHipRatio > 1.15) {
        // 역삼각형: 어깨 > 골반
        bodyType = '역삼각형 체형 (Inverted Triangle)';
        bodyKey = 'inverted_triangle';
    } else if (shoulderHipRatio < 0.9) {
        // 삼각형: 골반 > 어깨
        bodyType = '삼각형 체형 (Triangle/Pear)';
        bodyKey = 'triangle';
    } else if (shoulderHipRatio >= 0.95 && shoulderHipRatio <= 1.05) {
        // 어깨와 골반이 거의 같음
        // 허리 비율로 모래시계/직사각형 구분 (실제로는 허리 측정이 필요하지만 근사치 사용)
        const waistRatio = torsoHeight / shoulderWidth;

        if (waistRatio > 1.2) {
            bodyType = '모래시계 체형 (Hourglass)';
            bodyKey = 'hourglass';
        } else {
            bodyType = '직사각형 체형 (Rectangle)';
            bodyKey = 'rectangle';
        }
    } else {
        // 기본값
        bodyType = '직사각형 체형 (Rectangle)';
        bodyKey = 'rectangle';
    }

    return { type: bodyType, key: bodyKey };
}

// ==========================================
// 퍼스널 컬러 분석 (4계절 시스템)
// ==========================================

function analyzePersonalColor(face) {
    const keypoints = face.keypoints;

    // 볼 영역의 랜드마크 인덱스
    const cheekIndices = [50, 101, 118, 119, 280, 330, 347, 348];

    // 이마 영역 인덱스 추가 (더 정확한 분석을 위해)
    const foreheadIndices = [10, 67, 69, 104, 108, 151, 299, 337];

    // 캔버스에서 피부색 샘플링
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(video, 0, 0);

    const allIndices = [...cheekIndices, ...foreheadIndices];
    let totalR = 0, totalG = 0, totalB = 0;
    let sampleCount = 0;

    allIndices.forEach(index => {
        const point = keypoints[index];
        if (point) {
            const x = Math.round(point.x);
            const y = Math.round(point.y);

            // 주변 픽셀 샘플링 (7x7 영역으로 확대)
            for (let dx = -3; dx <= 3; dx++) {
                for (let dy = -3; dy <= 3; dy++) {
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
        return { type: '얼굴을 인식할 수 없습니다.', key: null };
    }

    // 평균 RGB
    const avgR = totalR / sampleCount;
    const avgG = totalG / sampleCount;
    const avgB = totalB / sampleCount;

    // RGB to HSV 변환
    const hsv = rgbToHsv(avgR, avgG, avgB);

    // RGB to Lab 변환 (더 정확한 색상 분석)
    const lab = rgbToLab(avgR, avgG, avgB);

    // 4계절 퍼스널 컬러 판별
    const seasonResult = determineSeasonalColor(hsv, lab, avgR, avgG, avgB);

    return seasonResult;
}

function determineSeasonalColor(hsv, lab, r, g, b) {
    const { h, s, v } = hsv;
    const brightness = (r + g + b) / 3;

    // Lab 색공간의 a* 값으로 웜/쿨 판별 (양수: 웜, 음수: 쿨)
    // Lab 색공간의 b* 값도 참고 (양수: 노란기, 음수: 파란기)
    const isWarm = lab.a > 5 || (lab.b > 10 && h >= 10 && h <= 50);
    const isLight = brightness > 160 || v > 0.7;

    let colorType = '';
    let colorKey = '';

    if (isWarm && isLight) {
        colorType = '봄 웜톤 (Spring Warm)';
        colorKey = 'spring_warm';
    } else if (!isWarm && isLight) {
        colorType = '여름 쿨톤 (Summer Cool)';
        colorKey = 'summer_cool';
    } else if (isWarm && !isLight) {
        colorType = '가을 웜톤 (Autumn Warm)';
        colorKey = 'autumn_warm';
    } else {
        colorType = '겨울 쿨톤 (Winter Cool)';
        colorKey = 'winter_cool';
    }

    return { type: colorType, key: colorKey };
}

// ==========================================
// 색상 변환 유틸리티
// ==========================================

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

function rgbToLab(r, g, b) {
    // RGB to XYZ
    r = r / 255;
    g = g / 255;
    b = b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

    return {
        l: (116 * fy) - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz)
    };
}

// ==========================================
// 결과 표시
// ==========================================

function displayResults(bodyResult, colorResult) {
    // 체형 결과
    bodyResultEl.textContent = bodyResult.type;

    // 퍼스널 컬러 결과
    colorResultEl.textContent = colorResult.type;

    // 컬러 팔레트 표시
    colorPaletteEl.innerHTML = '';
    if (colorResult.key && STYLE_DATABASE.personalColors[colorResult.key]) {
        const colorData = STYLE_DATABASE.personalColors[colorResult.key];
        colorData.palette.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = colorData.colorNames[index];
            colorPaletteEl.appendChild(swatch);
        });
    }

    // 스타일 추천 표시
    displayStyleRecommendations(bodyResult.key, colorResult.key);

    resultsEl.classList.remove('hidden');

    // 결과로 스크롤
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayStyleRecommendations(bodyKey, colorKey) {
    if (!styleRecommendEl) return;

    let html = '';

    // 체형별 스타일 추천
    if (bodyKey && STYLE_DATABASE.bodyTypes[bodyKey]) {
        const bodyData = STYLE_DATABASE.bodyTypes[bodyKey];
        html += `
            <div class="recommend-section">
                <h4>${bodyData.icons.join(' ')} ${bodyData.name} 체형 스타일링</h4>
                <p class="description">${bodyData.description}</p>
                <div class="recommend-list">
                    <strong>추천 스타일:</strong>
                    <ul>
                        ${bodyData.recommendations.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
                <div class="avoid-list">
                    <strong>피해야 할 스타일:</strong>
                    <span class="avoid-tags">${bodyData.avoid.map(a => `<span class="avoid-tag">${a}</span>`).join('')}</span>
                </div>
            </div>
        `;
    }

    // 퍼스널 컬러별 추천
    if (colorKey && STYLE_DATABASE.personalColors[colorKey]) {
        const colorData = STYLE_DATABASE.personalColors[colorKey];
        html += `
            <div class="recommend-section">
                <h4>${colorData.icons.join(' ')} ${colorData.name} 컬러 스타일링</h4>
                <p class="description">${colorData.description}</p>
                <div class="recommend-list">
                    <strong>추천 컬러:</strong>
                    <ul>
                        ${colorData.recommendations.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
                <div class="makeup-list">
                    <strong>메이크업 추천:</strong>
                    <ul>
                        ${colorData.makeup.map(m => `<li>${m}</li>`).join('')}
                    </ul>
                </div>
                <div class="avoid-list">
                    <strong>피해야 할 컬러:</strong>
                    <span class="avoid-tags">${colorData.avoid.map(a => `<span class="avoid-tag">${a}</span>`).join('')}</span>
                </div>
            </div>
        `;
    }

    styleRecommendEl.innerHTML = html || '<p>분석 결과를 바탕으로 스타일 추천을 생성할 수 없습니다.</p>';
}

// ==========================================
// 이벤트 리스너
// ==========================================

startBtn.addEventListener('click', () => {
    if (isStreaming) {
        stopCamera();
    } else {
        startCamera();
    }
});

analyzeBtn.addEventListener('click', analyze);

// 다시 측정하기 버튼 (있는 경우)
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        resultsEl.classList.add('hidden');
    });
}

// 앱 시작
init();
