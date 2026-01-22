// AI 스타일 코치 - 메인 스크립트

// DOM 요소
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loadingEl = document.getElementById('loading');
const videoContainer = document.getElementById('video-container');
const startBtn = document.getElementById('start-btn');
const resultsEl = document.getElementById('results');
const bodyResultEl = document.getElementById('body-result');
const colorResultEl = document.getElementById('color-result');
const colorPaletteEl = document.getElementById('color-palette');
const styleRecommendEl = document.getElementById('style-recommend');

// 단계별 분석 DOM 요소
const stepControls = document.getElementById('step-controls');
const colorAnalyzeBtn = document.getElementById('color-analyze-btn');
const bodyAnalyzeBtn = document.getElementById('body-analyze-btn');
const currentStepEl = document.getElementById('current-step');
const stepTextEl = document.getElementById('step-text');

// 모델 변수
let poseDetector = null;
let faceMeshDetector = null;
let isStreaming = false;
let animationId = null;

// 분석 결과 저장 변수
let savedColorResult = null;
let savedBodyResult = null;
let analysisStep = 0; // 0: 시작 전, 1: 퍼스널 컬러 완료, 2: 체형 완료

// 자동 분석을 위한 변수
let faceDetectionCount = 0;
let poseDetectionCount = 0;
const AUTO_ANALYZE_THRESHOLD = 30; // 약 1초 (30프레임) 동안 안정적으로 감지되면 자동 분석
let isAutoAnalyzing = false;

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

    // MoveNet 모델 로드 (체형 분석용) - tfjs 런타임 사용
    poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
        }
    );

    // FaceMesh 모델 로드 (퍼스널 컬러 분석용) - tfjs 런타임 사용
    console.log('FaceMesh 모델 로딩 시작...');
    faceMeshDetector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1
        }
    );
    console.log('FaceMesh 모델 로드 완료:', faceMeshDetector);

    console.log('모든 모델 로드 완료');
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

        // 비디오가 재생 가능한 상태가 되면 시작
       video.onloadedmetadata = async () => {
            // 캔버스의 내부 드로잉 해상도를 실제 비디오 크기와 일치시킴
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            console.log("Canvas 해상도 설정 완료:", canvas.width, canvas.height);

            try {
                await video.play();
            } catch (playError) {
                console.error('비디오 재생 실패:', playError);
            }

            isStreaming = true;
            startBtn.textContent = '카메라 중지';

            // 단계별 컨트롤 표시
            if (stepControls) {
                stepControls.classList.remove('hidden');
                colorAnalyzeBtn.disabled = false;
                updateStepUI();
            }

            // 약간의 지연 후 감지 시작 (모델 준비 시간)
            setTimeout(() => {
                startDetection();
            }, 500);
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

    // 단계별 컨트롤 숨기기
    if (stepControls) {
        stepControls.classList.add('hidden');
        colorAnalyzeBtn.disabled = true;
        bodyAnalyzeBtn.disabled = true;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 단계 UI 업데이트
function updateStepUI() {
    if (!currentStepEl || !stepTextEl) return;

    if (analysisStep === 0) {
        currentStepEl.textContent = '1단계';
        currentStepEl.classList.remove('completed');
        stepTextEl.textContent = '얼굴이 잘 보이도록 카메라를 바라봐주세요';
        colorAnalyzeBtn.disabled = false;
        colorAnalyzeBtn.classList.remove('completed');
        colorAnalyzeBtn.innerHTML = '🎨 퍼스널 컬러 분석';
        bodyAnalyzeBtn.disabled = true;
    } else if (analysisStep === 1) {
        currentStepEl.textContent = '2단계';
        currentStepEl.classList.remove('completed');
        stepTextEl.textContent = '전신이 보이도록 카메라에서 떨어져주세요';
        colorAnalyzeBtn.disabled = true;
        colorAnalyzeBtn.classList.add('completed');
        colorAnalyzeBtn.innerHTML = '✅ 퍼스널 컬러 완료';
        bodyAnalyzeBtn.disabled = false;
    } else if (analysisStep === 2) {
        currentStepEl.textContent = '완료';
        currentStepEl.classList.add('completed');
        stepTextEl.textContent = '분석이 완료되었습니다!';
        colorAnalyzeBtn.disabled = true;
        bodyAnalyzeBtn.disabled = true;
        bodyAnalyzeBtn.classList.add('completed');
        bodyAnalyzeBtn.innerHTML = '✅ 체형 분석 완료';
    }
}

// ==========================================
// 단계별 감지 시작/전환
// ==========================================

function startDetection() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // 단계에 따라 다른 감지 실행
    if (analysisStep === 0) {
        // 1단계: 얼굴 감지 (퍼스널 컬러용)
        detectFace();
    } else if (analysisStep === 1) {
        // 2단계: 포즈 감지 (체형 분석용)
        detectPose();
    }
    // analysisStep === 2: 분석 완료, 감지 불필요
}

// ==========================================
// 실시간 얼굴 감지 및 시각화 (1단계: 퍼스널 컬러)
// ==========================================

async function detectFace() {
    if (!isStreaming) return;

    try {
        // 비디오가 준비되었는지 확인
        if (video.readyState < 2) {
            animationId = requestAnimationFrame(detectFace);
            return;
        }

        // FaceMesh 모델이 정상적으로 로드되었는지 확인
        if (!faceMeshDetector) {
            console.error('FaceMesh 모델이 로드되지 않았습니다.');
            drawFlippedText('얼굴 인식 모델 로딩 중...', canvas.width / 2, 30, {
                font: '16px sans-serif',
                fillStyle: 'rgba(255, 100, 100, 0.9)'
            });
            animationId = requestAnimationFrame(detectFace);
            return;
        }

        const faces = await faceMeshDetector.estimateFaces(video, {
            flipHorizontal: false
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (faces.length > 0) {
            drawFace(faces[0]);

            // 자동 분석: 얼굴이 안정적으로 감지되면 자동 분석
            if (analysisStep === 0 && !isAutoAnalyzing) {
                faceDetectionCount++;

                // 진행 상황 표시 (반전 텍스트)
                const progress = Math.min(100, Math.round((faceDetectionCount / AUTO_ANALYZE_THRESHOLD) * 100));
                drawFlippedText(`퍼스널 컬러 분석 준비 중... ${progress}%`, canvas.width / 2, 30, {
                    font: 'bold 14px sans-serif',
                    fillStyle: 'rgba(255, 255, 255, 0.9)'
                });

                // 진행바 그리기 (반전)
                drawFlippedProgressBar(progress, 40, '#f093fb');

                if (faceDetectionCount >= AUTO_ANALYZE_THRESHOLD) {
                    isAutoAnalyzing = true;
                    faceDetectionCount = 0;
                    // 자동으로 퍼스널 컬러 분석 실행
                    analyzeColor();
                }
            }
        } else {
            // 얼굴이 감지되지 않으면 카운트 리셋
            faceDetectionCount = 0;

            // 얼굴이 감지되지 않을 때 안내 텍스트 표시 (반전)
            drawFlippedText('얼굴을 카메라에 맞춰주세요', canvas.width / 2, 30, {
                font: '16px sans-serif',
                fillStyle: 'rgba(255, 255, 255, 0.8)'
            });
        }
    } catch (error) {
        console.error('얼굴 감지 오류:', error);
    }

    animationId = requestAnimationFrame(detectFace);
}

function drawFace(face) {
    if (!ctx || !face.keypoints) return;

    // 매 프레임 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const keypoints = face.keypoints;

    // 1. 전체 랜드마크 (작은 점)
    ctx.fillStyle = "rgba(0, 255, 0, 0.6)"; // 초록색
    keypoints.forEach((pt, i) => {
        if (i % 10 === 0) { // 성능을 위해 10개당 하나씩
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });

    // 2. 퍼스널 컬러 샘플링 포인트 (큰 빨간 점)
    // 10: 이마, 50: 왼볼, 280: 오른볼
    const samplingIndices = [10, 50, 280];
    ctx.fillStyle = "#FF0000"; // 빨간색
    samplingIndices.forEach(idx => {
        const pt = keypoints[idx];
        if (pt) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI); // 크기 5로 확대
            ctx.fill();
            
            // 점 주변에 원형 테두리 추가 (가독성)
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

function drawOutline(keypoints, indices) {
    if (indices.length < 2) return;

    ctx.beginPath();
    const firstPoint = keypoints[indices[0]];
    if (firstPoint) {
        ctx.moveTo(firstPoint.x, firstPoint.y);
    }

    for (let i = 1; i < indices.length; i++) {
        const point = keypoints[indices[i]];
        if (point) {
            ctx.lineTo(point.x, point.y);
        }
    }

    // 닫힌 도형으로 만들기
    ctx.closePath();
    ctx.stroke();
}

// 캔버스가 CSS로 반전되어 있으므로 텍스트를 다시 반전시켜 정상으로 보이게 함
function drawFlippedText(text, x, y, options = {}) {
    ctx.save();
    // 텍스트 위치에서 반전
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.fillStyle = options.fillStyle || 'rgba(255, 255, 255, 0.9)';
    ctx.font = options.font || '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

// 진행바도 반전해서 그리기
function drawFlippedProgressBar(progress, y, color) {
    const barWidth = 200;
    const barHeight = 6;
    const barX = canvas.width / 2;

    ctx.save();
    ctx.translate(barX, y);
    ctx.scale(-1, 1);

    // 배경
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight);

    // 진행바
    ctx.fillStyle = color;
    ctx.fillRect(-barWidth / 2, 0, barWidth * (progress / 100), barHeight);

    ctx.restore();
}

// ==========================================
// 실시간 포즈 감지 및 시각화 (2단계: 체형 분석)
// ==========================================

async function detectPose() {
    if (!isStreaming) return;

    try {
        // 비디오가 준비되었는지 확인
        if (video.readyState < 2) {
            animationId = requestAnimationFrame(detectPose);
            return;
        }

        const poses = await poseDetector.estimatePoses(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (poses.length > 0) {
            const pose = poses[0];
            drawPose(pose);

            // 체형 분석에 필요한 키포인트가 충분히 감지되었는지 확인
            const keypoints = pose.keypoints;
            const leftShoulder = keypoints[5];
            const rightShoulder = keypoints[6];
            const leftHip = keypoints[11];
            const rightHip = keypoints[12];

            const hasValidPose = leftShoulder.score > 0.5 && rightShoulder.score > 0.5 &&
                                leftHip.score > 0.5 && rightHip.score > 0.5;

            // 자동 분석: 포즈가 안정적으로 감지되면 자동 분석
            if (analysisStep === 1 && !isAutoAnalyzing && hasValidPose) {
                poseDetectionCount++;

                // 진행 상황 표시 (반전 텍스트)
                const progress = Math.min(100, Math.round((poseDetectionCount / AUTO_ANALYZE_THRESHOLD) * 100));
                drawFlippedText(`체형 분석 준비 중... ${progress}%`, canvas.width / 2, 30, {
                    font: 'bold 14px sans-serif',
                    fillStyle: 'rgba(255, 255, 255, 0.9)'
                });

                // 진행바 그리기 (반전)
                drawFlippedProgressBar(progress, 40, '#667eea');

                if (poseDetectionCount >= AUTO_ANALYZE_THRESHOLD) {
                    isAutoAnalyzing = true;
                    poseDetectionCount = 0;
                    // 자동으로 체형 분석 실행
                    analyzeBody();
                }
            } else if (!hasValidPose) {
                poseDetectionCount = 0;
                drawFlippedText('전신이 더 잘 보이도록 뒤로 물러나주세요', canvas.width / 2, 30, {
                    font: '16px sans-serif',
                    fillStyle: 'rgba(255, 255, 255, 0.8)'
                });
            }
        } else {
            // 포즈가 감지되지 않으면 카운트 리셋
            poseDetectionCount = 0;

            // 포즈가 감지되지 않을 때 안내 텍스트 표시 (반전)
            drawFlippedText('전신이 보이도록 서주세요', canvas.width / 2, 30, {
                font: '16px sans-serif',
                fillStyle: 'rgba(255, 255, 255, 0.8)'
            });
        }
    } catch (error) {
        console.error('포즈 감지 오류:', error);
    }

    animationId = requestAnimationFrame(detectPose);
}

function drawPose(pose) {
    const keypoints = pose.keypoints;

    // 연결선 정의 (MoveNet)
    const connections = [
        [5, 6],   // 어깨
        [5, 7], [7, 9],   // 왼팔
        [6, 8], [8, 10],  // 오른팔
        [5, 11], [6, 12], // 몸통
        [11, 12], // 골반
        [11, 13], [13, 15], // 왼다리
        [12, 14], [14, 16]  // 오른다리
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
// 단계별 분석 실행
// ==========================================

// 1단계: 퍼스널 컬러 분석
async function analyzeColor() {
    if (!colorAnalyzeBtn) return;

    colorAnalyzeBtn.disabled = true;
    colorAnalyzeBtn.innerHTML = '분석 중...';

    try {
        const faces = await faceMeshDetector.estimateFaces(video);

        if (faces.length > 0) {
            savedColorResult = analyzePersonalColor(faces[0]);

            // 퍼스널 컬러 결과만 먼저 표시
            colorResultEl.textContent = savedColorResult.type;

            // 컬러 팔레트 표시
            colorPaletteEl.innerHTML = '';
            if (savedColorResult.key && STYLE_DATABASE.personalColors[savedColorResult.key]) {
                const colorData = STYLE_DATABASE.personalColors[savedColorResult.key];
                colorData.palette.forEach((color, index) => {
                    const swatch = document.createElement('div');
                    swatch.className = 'color-swatch';
                    swatch.style.backgroundColor = color;
                    swatch.title = colorData.colorNames[index];
                    colorPaletteEl.appendChild(swatch);
                });
            }

            // 체형 분석 진행 여부 확인
            const wantBodyAnalysis = confirm(
                '퍼스널 컬러 분석이 완료되었습니다!\n\n' +
                `결과: ${savedColorResult.type}\n\n` +
                '체형 분석도 진행하시겠습니까?\n' +
                '(확인: 체형 분석 진행 / 취소: 퍼스널 컬러만 보기)'
            );

            if (wantBodyAnalysis) {
                // 단계 진행 (체형 분석으로)
                analysisStep = 1;
                updateStepUI();

                // 자동 분석 플래그 리셋 (2단계 자동 분석 위해)
                isAutoAnalyzing = false;
                poseDetectionCount = 0;

                // 포즈 감지로 전환 (얼굴 → 전신)
                startDetection();

                // 결과 영역 표시 (퍼스널 컬러만, 체형은 대기)
                bodyResultEl.textContent = '전신이 감지되면 자동으로 분석됩니다';
                resultsEl.classList.remove('hidden');
            } else {
                // 퍼스널 컬러만으로 완료
                analysisStep = 2;

                // 감지 중지
                startDetection();

                // UI 업데이트 (퍼스널 컬러만 완료 상태)
                currentStepEl.textContent = '완료';
                currentStepEl.classList.add('completed');
                stepTextEl.textContent = '퍼스널 컬러 분석이 완료되었습니다!';
                colorAnalyzeBtn.disabled = true;
                colorAnalyzeBtn.classList.add('completed');
                colorAnalyzeBtn.innerHTML = '✅ 퍼스널 컬러 완료';
                bodyAnalyzeBtn.disabled = true;

                // 결과 표시 (퍼스널 컬러만)
                bodyResultEl.textContent = '분석하지 않음';
                resultsEl.classList.remove('hidden');

                // 퍼스널 컬러 스타일 추천만 표시
                displayStyleRecommendations(null, savedColorResult.key);

                // 공유 카드 업데이트 (체형 없이)
                updateShareCard({ type: '분석하지 않음', key: null }, savedColorResult);

                // 결과로 스크롤
                resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

        } else {
            alert('얼굴을 인식할 수 없습니다. 카메라를 정면으로 바라봐주세요.');
            colorAnalyzeBtn.disabled = false;
            colorAnalyzeBtn.innerHTML = '🎨 퍼스널 컬러 분석';
        }

    } catch (error) {
        console.error('퍼스널 컬러 분석 오류:', error);
        alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
        colorAnalyzeBtn.disabled = false;
        colorAnalyzeBtn.innerHTML = '🎨 퍼스널 컬러 분석';
    }
}

// 2단계: 체형 분석 (퍼스널 컬러 포함)
async function analyzeBody() {
    if (!bodyAnalyzeBtn) return;

    bodyAnalyzeBtn.disabled = true;
    bodyAnalyzeBtn.innerHTML = '분석 중...';

    try {
        const poses = await poseDetector.estimatePoses(video);

        if (poses.length > 0) {
            savedBodyResult = analyzeBodyType(poses[0]);

            if (savedBodyResult.key) {
                // 체형 결과 표시
                bodyResultEl.textContent = savedBodyResult.type;

                // 단계 완료
                analysisStep = 2;
                updateStepUI();

                // 감지 중지 (분석 완료)
                startDetection();

                // 퍼스널 컬러 + 체형 기반 스타일 추천 표시
                displayStyleRecommendations(savedBodyResult.key, savedColorResult?.key);

                // 공유 카드 업데이트
                updateShareCard(savedBodyResult, savedColorResult || { type: '-', key: null });

                // 결과로 스크롤
                resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

            } else {
                // 체형 인식 실패
                bodyResultEl.textContent = savedBodyResult.type;
                bodyAnalyzeBtn.disabled = false;
                bodyAnalyzeBtn.innerHTML = '🕴️ 체형 분석';
                alert('전신이 잘 보이도록 카메라에서 더 떨어져주세요.');
            }

        } else {
            alert('포즈를 인식할 수 없습니다. 전신이 보이도록 서주세요.');
            bodyAnalyzeBtn.disabled = false;
            bodyAnalyzeBtn.innerHTML = '🕴️ 체형 분석';
        }

    } catch (error) {
        console.error('체형 분석 오류:', error);
        alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
        bodyAnalyzeBtn.disabled = false;
        bodyAnalyzeBtn.innerHTML = '🕴️ 체형 분석';
    }
}

// ==========================================
// 체형 분석 (고도화)
// ==========================================

function analyzeBodyType(pose) {
    const keypoints = pose.keypoints;

    // MoveNet keypoint 인덱스
    // 5: left_shoulder, 6: right_shoulder
    // 11: left_hip, 12: right_hip
    // 13: left_knee, 14: right_knee
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

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
    // lab.b: 노란색(웜) vs 파란색(쿨) 수치
    // lab.l: 밝기(명도)
    
    // 한국인 피부 기준 수치 보정 (보통 13~15 사이가 경계선)
    const isWarm = lab.b > 14.5; 
    const isLight = lab.l > 62; 

    let colorKey = '';
    if (isWarm) {
        colorKey = isLight ? 'spring_warm' : 'autumn_warm';
    } else {
        colorKey = isLight ? 'summer_cool' : 'winter_cool';
    }

    const colorData = STYLE_DATABASE.personalColors[colorKey];
    return { type: colorData.name, key: colorKey };
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

    // 공유 카드 업데이트
    updateShareCard(bodyResult, colorResult);

    resultsEl.classList.remove('hidden');

    // 결과로 스크롤
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 공유 카드 업데이트
function updateShareCard(bodyResult, colorResult) {
    const shareBodyResult = document.getElementById('share-body-result');
    const shareColorResult = document.getElementById('share-color-result');
    const sharePalette = document.getElementById('share-palette');

    if (shareBodyResult) {
        // 체형 이름만 추출 (괄호 앞부분)
        const bodyName = bodyResult.type ? bodyResult.type.split('(')[0].trim() : '-';
        shareBodyResult.textContent = bodyName;
    }

    if (shareColorResult) {
        // 퍼스널 컬러 이름만 추출 (괄호 앞부분)
        const colorName = colorResult.type ? colorResult.type.split('(')[0].trim() : '-';
        shareColorResult.textContent = colorName;
    }

    if (sharePalette && colorResult.key && STYLE_DATABASE.personalColors[colorResult.key]) {
        sharePalette.innerHTML = '';
        const colorData = STYLE_DATABASE.personalColors[colorResult.key];
        colorData.palette.forEach((color) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            sharePalette.appendChild(swatch);
        });
    }
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

// 단계별 분석 버튼
if (colorAnalyzeBtn) {
    colorAnalyzeBtn.addEventListener('click', analyzeColor);
}

if (bodyAnalyzeBtn) {
    bodyAnalyzeBtn.addEventListener('click', analyzeBody);
}

// 다시 측정하기 버튼
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        // 결과 숨기기
        resultsEl.classList.add('hidden');

        // 분석 상태 초기화
        analysisStep = 0;
        savedColorResult = null;
        savedBodyResult = null;

        // 자동 분석 변수 초기화
        faceDetectionCount = 0;
        poseDetectionCount = 0;
        isAutoAnalyzing = false;

        // UI 초기화
        updateStepUI();

        // 얼굴 감지 재시작 (1단계로 돌아가기)
        if (isStreaming) {
            startDetection();
        }

        // 스타일 추천 초기화
        if (styleRecommendEl) {
            styleRecommendEl.innerHTML = '';
        }
    });
}

// ==========================================
// SNS 공유 기능
// ==========================================

const SITE_URL = 'https://re-spring.pages.dev';

// 이미지 다운로드
const downloadBtn = document.getElementById('download-btn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
        const shareCard = document.getElementById('share-card');
        if (!shareCard) return;

        try {
            downloadBtn.textContent = '생성 중...';
            downloadBtn.disabled = true;

            const canvas = await html2canvas(shareCard, {
                scale: 2,
                backgroundColor: null,
                useCORS: true
            });

            const link = document.createElement('a');
            link.download = 'ai-style-coach-result.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            downloadBtn.textContent = '📥 이미지 저장';
            downloadBtn.disabled = false;
        } catch (error) {
            console.error('이미지 생성 실패:', error);
            alert('이미지 생성에 실패했습니다.');
            downloadBtn.textContent = '📥 이미지 저장';
            downloadBtn.disabled = false;
        }
    });
}

// 트위터 공유
const twitterBtn = document.getElementById('twitter-btn');
if (twitterBtn) {
    twitterBtn.addEventListener('click', () => {
        const bodyText = document.getElementById('share-body-result')?.textContent || '';
        const colorText = document.getElementById('share-color-result')?.textContent || '';

        const text = `AI 스타일 코치 분석 결과!\n\n체형: ${bodyText}\n퍼스널 컬러: ${colorText}\n\n나도 분석해보기 👇`;
        const url = encodeURIComponent(SITE_URL);
        const tweetText = encodeURIComponent(text);

        window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${url}`, '_blank');
    });
}

// 페이스북 공유
const facebookBtn = document.getElementById('facebook-btn');
if (facebookBtn) {
    facebookBtn.addEventListener('click', () => {
        const url = encodeURIComponent(SITE_URL);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    });
}

// 카카오톡 공유
const kakaoBtn = document.getElementById('kakao-btn');
if (kakaoBtn) {
    kakaoBtn.addEventListener('click', () => {
        const bodyText = document.getElementById('share-body-result')?.textContent || '';
        const colorText = document.getElementById('share-color-result')?.textContent || '';

        // 카카오 SDK가 없으면 클립보드 복사로 대체
        if (typeof Kakao !== 'undefined' && Kakao.isInitialized()) {
            Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: 'AI 스타일 코치 분석 결과',
                    description: `체형: ${bodyText} / 퍼스널 컬러: ${colorText}`,
                    imageUrl: 'https://re-spring.pages.dev/og-image.png',
                    link: {
                        mobileWebUrl: SITE_URL,
                        webUrl: SITE_URL
                    }
                },
                buttons: [
                    {
                        title: '나도 분석하기',
                        link: {
                            mobileWebUrl: SITE_URL,
                            webUrl: SITE_URL
                        }
                    }
                ]
            });
        } else {
            // 카카오 SDK 없으면 링크 복사
            const shareText = `AI 스타일 코치 분석 결과!\n체형: ${bodyText}\n퍼스널 컬러: ${colorText}\n\n나도 분석해보기: ${SITE_URL}`;

            navigator.clipboard.writeText(shareText).then(() => {
                alert('공유 내용이 클립보드에 복사되었습니다!\n카카오톡에 붙여넣기 해주세요.');
            }).catch(() => {
                prompt('아래 내용을 복사해서 공유해주세요:', shareText);
            });
        }
    });
}

// 앱 시작
init();
