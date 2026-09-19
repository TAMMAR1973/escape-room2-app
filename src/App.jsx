import React, { useState, useRef, useEffect } from 'react';
import { Upload, FolderOpen, Trash2, Link as LinkIcon, Move, Code, X, Check, Share2, FileDown, Lock, Unlock, Key, Trophy, PlayCircle, Edit3, ArrowLeft, FileText, FileQuestion, PlusCircle, ArrowUp, ArrowDown, ListOrdered, Save, Image as ImageIcon } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCrog3JWtlKhWs-T42JyNXj94037K3yZ98",
  authDomain: "hadarklik.firebaseapp.com",
  projectId: "hadarklik",
  storageBucket: "hadarklik.firebasestorage.app",
  messagingSenderId: "781018876591",
  appId: "1:781018876591:web:a1f413796f5a00c1c5625a",
  measurementId: "G-1DF1GQDTRL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PREDEFINED_COLORS = [
  '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', 
  '#f43f5e', '#3b82f6', '#14b8a6', '#f59e0b', '#000000', '#ffffff'
];

const getMediaEmbedHtml = (url) => {
  if (!url) return '';
  if (url.includes('<iframe') || url.includes('<div') || url.includes('<script')) {
      return `<div class="media-container embed-media" style="width:100%; overflow:hidden; border-radius:12px; margin-bottom:20px;">${url}</div>`;
  }
  if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('postimg.cc') || url.includes('imgur.com')) {
    return `<div class="media-container image-media"><img src="${url}" alt="חומר עזר" /></div>`;
  }
  let videoId = null;
  if (url.includes('youtube.com/watch?v=')) { videoId = url.split('v=')[1].split('&')[0]; } 
  else if (url.includes('youtu.be/')) { videoId = url.split('youtu.be/')[1].split('?')[0]; }
  
  if (videoId) { return `<div class="media-container video-media"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`; }
  return '';
};

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const generateUniqueId = (prefix) => prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

let pannellumLoaded = false;
const loadPannellum = () => {
  return new Promise((resolve, reject) => {
    if (pannellumLoaded && window.pannellum) { resolve(window.pannellum); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    script.onload = () => { pannellumLoaded = true; resolve(window.pannellum); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function App() {
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [imageType, setImageType] = useState('2d'); 
  const [imageSrc, setImageSrc] = useState(null);
  const [points, setPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [draggingPointId, setDraggingPointId] = useState(null);
  const [justDropped, setJustDropped] = useState(false);
  const [activeColor, setActiveColor] = useState('#d946ef');
  
  const [finalCode, setFinalCode] = useState('');
  const [finalMessage, setFinalMessage] = useState('כל הכבוד! הצלחתם לפרוץ את החדר!');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Firebase state
  const [isSaving, setIsSaving] = useState(false);
  const [savedCodeInfo, setSavedCodeInfo] = useState(null);
  const [showLoadInput, setShowLoadInput] = useState(false);
  const [loadCodeInput, setLoadCodeInput] = useState('');
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  
  // Custom Modals
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Play Mode State
  const [unlockedPoints, setUnlockedPoints] = useState([]); 
  const [solvedPoints, setSolvedPoints] = useState([]);     
  const [activeGamePoint, setActiveGamePoint] = useState(null); 
  const [guess, setGuess] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState({}); 
  const [orderStates, setOrderStates] = useState({});
  const [finalCodeInput, setFinalCodeInput] = useState([]);
  const [solvedQuestions, setSolvedQuestions] = useState({}); 
  const [questionError, setQuestionError] = useState({}); 

  const imageContainerRef = useRef(null);
  const pannellumViewerRef = useRef(null);
  const finalInputRefs = useRef([]);

  useEffect(() => {
     if (imageType !== '360' || !imageSrc || isPlayMode) {
         if (pannellumViewerRef.current) { pannellumViewerRef.current.destroy(); pannellumViewerRef.current = null; }
         return;
     }
     let viewer = null;
     loadPannellum().then((pannellum) => {
        if (pannellumViewerRef.current) pannellumViewerRef.current.destroy();
        viewer = pannellum.viewer('pannellum-editor', { 
           type: 'equirectangular', panorama: imageSrc, autoLoad: true, showControls: true, mouseZoom: false,
           hfov: 120, minHfov: 50, maxHfov: 150
        });
        pannellumViewerRef.current = viewer;
        sync360Hotspots(); 
     }).catch(err => console.error("Pannellum failed", err));
     return () => { if (viewer) viewer.destroy(); }
  }, [imageSrc, imageType, isPlayMode]);

  useEffect(() => { sync360Hotspots(); }, [points, selectedPoint]);

  const sync360Hotspots = () => {
      if (!pannellumViewerRef.current || imageType !== '360' || isPlayMode) return;
      const viewer = pannellumViewerRef.current;
      const existingIds = window.currentHotspotIds || [];
      existingIds.forEach(id => { try { viewer.removeHotSpot(id); } catch(e){} });
      window.currentHotspotIds = [];

      points.forEach(point => {
          const pitch = ((point.y / 100) * 180) - 90;
          const yaw = ((point.x / 100) * 360) - 180;
          viewer.addHotSpot({
              id: point.id, pitch: -pitch, yaw: yaw, type: "info",
              cssClass: `custom-hotspot ${selectedPoint === point.id ? 'selected' : ''}`,
              createTooltipFunc: (hotSpotDiv) => {
                  hotSpotDiv.classList.add('custom-hotspot');
                  if (selectedPoint === point.id) hotSpotDiv.classList.add('selected');
                  hotSpotDiv.style.backgroundColor = point.color;
                  hotSpotDiv.innerHTML = point.label;
                  hotSpotDiv.onmousedown = (e) => { e.stopPropagation(); e.preventDefault(); setSelectedPoint(point.id); setDraggingPointId(point.id); };
                  hotSpotDiv.onclick = (e) => { e.stopPropagation(); setSelectedPoint(point.id); };
              }
          });
          window.currentHotspotIds.push(point.id);
      });
  };

  useEffect(() => {
    if (finalCode !== undefined) {
      const cleanTargetCode = finalCode.replace(/\s+/g, '');
      setFinalCodeInput(Array(cleanTargetCode.length).fill(''));
    }
  }, [finalCode]);

  const showToast = (message) => { setToastMsg(message); setTimeout(() => setToastMsg(''), 4000); };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageType(type); setImageSrc(event.target.result);
      if(!isAppStarted) { setPoints([]); setSelectedPoint(null); setIsAppStarted(true); }
      showToast(type === '360' ? 'תמונת 360 הועלתה בהצלחה!' : 'תמונה הועלתה בהצלחה!');
    };
    reader.readAsDataURL(file);
  };

  const handleChangeImage = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => { setImageSrc(event.target.result); showToast('התמונה הוחלפה! הנקודות נשמרו באוויר.'); };
      reader.readAsDataURL(file);
  };

  const executeReset = () => {
      setIsAppStarted(false); setImageSrc(null); setPoints([]); setFinalCode(''); setSelectedPoint(null);
      setSavedCodeInfo(null); setShowLoadInput(false); setLoadCodeInput(''); setShowResetConfirm(false);
  };

  const handleSaveToCloud = async () => {
      if (!imageSrc || points.length === 0) { alert('הוסיפו תמונה ותחנה אחת לפחות.'); return; }
      setIsSaving(true);
      try {
          const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await setDoc(doc(db, "escaperooms", newCode), { imageSrc, imageType, points, finalCode, finalMessage, createdAt: new Date().toISOString() });
          setSavedCodeInfo(newCode); showToast('הפעילות נשמרה בענן!');
      } catch (error) { alert('שגיאה בשמירה. נסו שוב.'); }
      setIsSaving(false);
  };

  const handleLoadFromCloud = async () => {
      const code = loadCodeInput.trim().toUpperCase();
      if (!code) return;
      setIsLoadingCloud(true);
      try {
          const docSnap = await getDoc(doc(db, "escaperooms", code));
          if (docSnap.exists()) {
              const data = docSnap.data();
              setImageSrc(data.imageSrc); setImageType(data.imageType || '2d'); setPoints(data.points || []);
              setFinalCode(data.finalCode || ''); setFinalMessage(data.finalMessage || 'כל הכבוד!');
              setIsAppStarted(true); showToast('הפעילות נטענה בהצלחה!');
          } else { alert('לא נמצא קוד כזה.'); }
      } catch (error) { alert('שגיאה בטעינה. נסו שוב.'); }
      setIsLoadingCloud(false);
  };

  const getGameHTML = () => {
    const safePointsData = JSON.stringify(points).replace(/</g, '\\u003c');
    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>מסע של מרחב בקליק</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
  <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
  <style>
    :root { --bg: #fdf4ff; --surface: #ffffff; --text: #4a044e; --accent: #a21caf; --success: #10b981; --danger: #e11d48; --border: #fae8ff; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); display: flex; flex-direction: column; min-height: 100vh; overflow-x: hidden; }
    .game-header { background: var(--surface); padding: 15px 20px; border-bottom: 2px solid var(--border); display: flex; justify-content: space-between; align-items: center; z-index: 10; box-shadow: 0 4px 15px rgba(0,0,0,0.05);}
    .game-header h1 { margin: 0; font-size: 20px; color: var(--accent); font-weight: 900; }
    .btn-final { background: linear-gradient(135deg, #d946ef, #a855f7); color: white; border: none; padding: 10px 20px; border-radius: 999px; font-weight: bold; cursor: pointer; transition: 0.2s;}
    .main-area { flex: 1; position: relative; width: 100%; height: calc(100vh - 65px); background: #f3e8ff;}
    
    .canvas-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .canvas-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
    #panorama { width: 100%; height: 100%; }
    
    .point-wrapper { position: absolute; transform: translate(-50%, -50%); z-index: 10; }
    .point-inner { padding: 5px 12px; min-width: 44px; height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; cursor: pointer; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); animation: floatPoint 3s ease-in-out infinite; white-space: nowrap;}
    @keyframes floatPoint { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    
    .custom-hotspot { padding: 5px 12px; min-width: 44px; height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; cursor: pointer; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap; margin-top:-22px; margin-left:-22px;}
    
    .point-wrapper.locked .point-inner::after, .custom-hotspot.locked::after { content: '🔒'; position: absolute; bottom: -5px; right: -5px; font-size: 14px; background: white; border-radius: 50%; padding: 2px;}
    .point-wrapper.unlocked .point-inner, .custom-hotspot.unlocked { background-color: var(--success) !important; border-color: white; animation: none;}
    
    .modal-overlay { position: fixed; inset: 0; background: rgba(74, 4, 78, 0.7); backdrop-filter: blur(5px); display: none; justify-content: center; align-items: center; z-index: 100; padding: 20px;}
    .modal-overlay.active { display: flex; }
    .modal-content { background: var(--surface); padding: 30px; border-radius: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; position: relative; }
    .close-btn { position: absolute; top: 15px; left: 15px; background: #f3e8ff; border: none; color: #a855f7; font-size: 24px; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;}
    
    .media-container { width: 100%; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .embed-media { display: flex; justify-content: center; }
    .video-media { position: relative; padding-bottom: 56.25%; height: 0; }
    .video-media iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }
    .image-media img { width: 100%; height: auto; }
    
    input[type="text"] { width: 100%; padding: 12px; border-radius: 12px; border: 2px solid #e9d5ff; background: #faf5ff; font-size: 18px; outline: none; font-weight: bold; margin-bottom: 15px; text-align: center;}
    .btn { background: var(--success); color: white; border: none; padding: 12px 20px; width: 100%; border-radius: 12px; font-size: 16px; cursor: pointer; font-weight: bold; margin-bottom: 10px;}
    .error { color: var(--danger); font-size: 15px; margin-bottom: 15px; display: none; font-weight: bold; background: #ffe4e6; padding: 10px; border-radius: 8px; text-align: center;}
    
    .trivia-option { display: block; width: 100%; text-align: right; padding: 12px 15px; margin-bottom: 10px; background: #fdf4ff; border: 2px solid #fae8ff; border-radius: 12px; cursor: pointer; font-size: 16px; }
    .trivia-option.selected { background: #f0abfc; border-color: #d946ef; color: white; font-weight: bold;}
    .order-item { display: flex; justify-content: space-between; align-items: center; background: #fdf4ff; border: 2px solid #fae8ff; padding: 10px 15px; border-radius: 12px; margin-bottom: 8px; font-weight: bold;}
    .order-btns button { background: #e9d5ff; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; margin-left: 5px;}
  </style>
</head>
<body>
  <div class="game-header"><h1>מסע של מרחב בקליק</h1><button class="btn-final" onclick="openFinalDoor()">לכספת הראשית 🗝️</button></div>
  <div class="main-area">
      ${imageType === '360' ? `<div id="panorama" dir="ltr"></div>` : `<div class="canvas-container"><img src="${imageSrc}" alt="חדר בריחה" /><div id="points-container"></div></div>`}
  </div>
  <div class="modal-overlay" id="mainModal">
    <div class="modal-content">
      <button class="close-btn" onclick="closeModal()">×</button>
      <h2 id="modalTitle" style="color:var(--accent); text-align:center; margin-top:0; border-bottom: 2px solid #fae8ff; padding-bottom: 15px;">תחנה</h2>
      <div class="error" id="errorMsg"></div>
      <div id="modalBody"></div>
    </div>
  </div>
  <script>
    const pointsData = ${safePointsData}; const imageType = "${imageType}"; const finalRoomCode = "${finalCode || ''}"; const finalRoomMessage = "${finalMessage || ''}";
    let unlockedPointIds = []; let solvedPointIds = []; let currentActivePoint = null;
    let studentAnswers = {}; let orderStates = {}; let solvedQuestions = {}; let viewer = null;

    function shuffleArr(array) { const newArr = [...array]; for (let i = newArr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [newArr[i], newArr[j]] = [newArr[j], newArr[i]]; } return newArr; }

    function initGame() {
      if (imageType === '360') {
          viewer = pannellum.viewer('panorama', { type: 'equirectangular', panorama: '${imageSrc}', autoLoad: true, showControls: true, mouseZoom: false, hfov: 120, minHfov: 50, maxHfov: 150 });
          pointsData.forEach(p => {
              const isSolved = solvedPointIds.includes(p.id); const isLocked = !unlockedPointIds.includes(p.id) && p.entryPasscode && p.entryPasscode.trim() !== '';
              let classes = 'custom-hotspot' + (isSolved ? ' unlocked' : isLocked ? ' locked' : '');
              const pitch = ((p.y / 100) * 180) - 90; const yaw = ((p.x / 100) * 360) - 180;
              viewer.addHotSpot({ id: p.id, pitch: -pitch, yaw: yaw, type: "info", cssClass: classes, createTooltipFunc: (div) => { div.className = classes; div.style.backgroundColor = isSolved ? 'var(--success)' : p.color; div.innerHTML = isSolved ? '' : p.label; div.onclick = () => openPoint(p.id); } });
          });
      } else {
          const container = document.getElementById('points-container'); container.innerHTML = '';
          pointsData.forEach(p => {
            const isSolved = solvedPointIds.includes(p.id); const isLocked = !unlockedPointIds.includes(p.id) && p.entryPasscode && p.entryPasscode.trim() !== '';
            const wrapper = document.createElement('div'); wrapper.className = 'point-wrapper' + (isSolved ? ' unlocked' : isLocked ? ' locked' : '');
            wrapper.style.left = p.x + '%'; wrapper.style.top = p.y + '%';
            const inner = document.createElement('div'); inner.className = 'point-inner'; inner.style.backgroundColor = isSolved ? 'var(--success)' : p.color; inner.innerText = isSolved ? '' : p.label; 
            wrapper.appendChild(inner); wrapper.onclick = () => openPoint(p.id); container.appendChild(wrapper);
          });
      }
    }

    function getMediaHtml(url) {
      if (!url) return '';
      if (url.includes('<iframe') || url.includes('<div') || url.includes('<script')) return \`<div class="media-container embed-media" style="width:100%; overflow:hidden; border-radius:12px; margin-bottom:20px;">\${url}</div>\`;
      if (url.match(/\\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('postimg.cc') || url.includes('imgur.com')) return \`<div class="media-container image-media"><img src="\${url}" alt="חומר עזר" /></div>\`;
      let videoId = null; if (url.includes('youtube.com/watch?v=')) { videoId = url.split('v=')[1].split('&')[0]; } else if (url.includes('youtu.be/')) { videoId = url.split('youtu.be/')[1].split('?')[0]; }
      if (videoId) return \`<div class="media-container video-media"><iframe src="https://www.youtube.com/embed/\${videoId}" allowfullscreen></iframe></div>\`;
      return '';
    }

    function openPoint(id) {
      currentActivePoint = pointsData.find(p => p.id === id);
      const isUnlocked = unlockedPointIds.includes(id) || (!currentActivePoint.entryPasscode || currentActivePoint.entryPasscode.trim() === '');
      if(!currentActivePoint.entryPasscode && !unlockedPointIds.includes(id)) unlockedPointIds.push(id);
      document.getElementById('modalTitle').innerText = currentActivePoint.label; document.getElementById('errorMsg').style.display = 'none';
      if(currentActivePoint.questions) { currentActivePoint.questions.forEach(q => { if(q.type === 'order' && !orderStates[q.id]) orderStates[q.id] = shuffleArr([...q.options]); }); }
      if (solvedPointIds.includes(id)) renderSuccess(); else if (isUnlocked) renderTasks(); else renderEntry();
      document.getElementById('mainModal').classList.add('active');
    }

    function renderEntry() {
      document.getElementById('modalBody').innerHTML = \`<div style="text-align:center; padding: 20px 0;"><div style="font-size: 60px; margin-bottom: 15px;">🔒</div><p style="font-size: 16px; margin-bottom: 15px; font-weight: bold;">התחנה נעולה. הזינו את הקוד כדי להיכנס:</p><input type="text" id="entryPasscodeInput" placeholder="קוד פתיחה..."><button class="btn" style="background: linear-gradient(135deg, #d946ef, #a855f7);" onclick="checkEntryCode()">פתח תחנה</button>\${currentActivePoint.entryHint ? \`<button class="btn" style="background: white; color: #f59e0b; border: 2px solid #fcd34d;" onclick="document.getElementById('entryHintBox').style.display='block'">צריך רמז?</button><div id="entryHintBox" style="display:none; background: #fffbeb; padding: 15px; border-radius: 12px; margin-top: 15px; font-size: 14px;">\${currentActivePoint.entryHint}</div>\` : ''}</div>\`;
    }

    function checkEntryCode() {
      const guess = document.getElementById('entryPasscodeInput').value.trim().toLowerCase(); const correct = (currentActivePoint.entryPasscode || '').trim().toLowerCase();
      if (guess === correct) { unlockedPointIds.push(currentActivePoint.id); if (imageType === '360') { initGame(); } else { document.querySelector(\`.point-wrapper:nth-child(\${pointsData.findIndex(p=>p.id===currentActivePoint.id)+1})\`).classList.remove('locked'); } renderTasks(); } 
      else { document.getElementById('errorMsg').innerText = 'קוד שגוי, נסו שוב!'; document.getElementById('errorMsg').style.display = 'block'; }
    }

    function renderTasks() {
      const mediaHtml = getMediaHtml(currentActivePoint.mediaUrl);
      const linkHtml = (currentActivePoint.mediaUrl && !mediaHtml) ? \`<a href="\${currentActivePoint.mediaUrl}" target="_blank" style="display:block; text-align:center; padding:10px; background:#fdf4ff; color:#c026d3; border-radius:8px; margin-bottom:15px; text-decoration:none; font-weight:bold;">לחצו למעבר לחומר עזר ↗</a>\` : '';
      document.getElementById('modalBody').innerHTML = \`\${mediaHtml}\${currentActivePoint.learningText ? \`<div style="text-align: right; margin-bottom: 20px; white-space: pre-wrap; font-size: 16px; background: #faf5ff; padding: 15px; border-radius: 12px;">\${currentActivePoint.learningText}</div>\` : ''}\${linkHtml}<div id="questionsContainer"></div><div id="finishTaskBtnContainer" style="display: none; margin-top: 20px;"><button class="btn" onclick="completeStation()">סיום תחנה והתקדמות 🔓</button></div>\${currentActivePoint.taskHint ? \`<button class="btn" style="background: white; color: #f59e0b; border: 2px solid #fcd34d; margin-top: 15px;" onclick="document.getElementById('taskHintBox').style.display='block'">רמז כללי למשימות 💡</button><div id="taskHintBox" style="display:none; background: #fffbeb; padding: 15px; border-radius: 12px; margin-top: 10px; font-size: 14px;">\${currentActivePoint.taskHint}</div>\` : ''}\`;
      renderQuestions();
    }

    function renderQuestions() {
      const qContainer = document.getElementById('questionsContainer'); qContainer.innerHTML = '';
      if(!currentActivePoint.questions || currentActivePoint.questions.length === 0) { document.getElementById('finishTaskBtnContainer').style.display = 'block'; return; }
      let allQuestionsSolved = true;
      currentActivePoint.questions.forEach((q, index) => {
         const isSolved = solvedQuestions[q.id]; if (!isSolved) allQuestionsSolved = false;
         const qBlock = document.createElement('div'); qBlock.style.background = '#fff'; qBlock.style.border = '2px solid #e9d5ff'; qBlock.style.borderRadius = '16px'; qBlock.style.padding = '20px'; qBlock.style.marginBottom = '20px'; qBlock.style.textAlign = 'right';
         const title = document.createElement('div'); title.style.fontWeight = '800'; title.style.fontSize = '18px'; title.style.marginBottom = '15px'; title.innerText = \`שאלה \${index + 1}: \${q.text}\`; qBlock.appendChild(title);
         if (isSolved) {
            const succDiv = document.createElement('div'); succDiv.style.background = '#ecfdf5'; succDiv.style.padding = '10px'; succDiv.style.borderRadius = '12px'; succDiv.style.display = 'flex'; succDiv.style.justifyContent = 'space-between';
            let succHtml = '<span>✓ תשובה נכונה!</span>';
            if (q.rewardChar && q.rewardChar.trim() !== '') { succHtml += \`<div style="display:flex; align-items:center; gap:5px;"><span style="font-size:12px;">צופן:</span><div style="background: white; border: 2px solid #10b981; color: #10b981; padding: 2px 10px; border-radius: 8px; font-weight: 900;" dir="ltr">\${q.rewardChar}</div></div>\`; }
            succDiv.innerHTML = succHtml; qBlock.appendChild(succDiv);
         } else {
            const qErr = document.createElement('div'); qErr.id = 'err_' + q.id; qErr.className = 'error'; qBlock.appendChild(qErr);
            if (q.type === 'open') { const inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'תשובה...'; inp.value = studentAnswers[q.id] || ''; inp.oninput = (e) => studentAnswers[q.id] = e.target.value; qBlock.appendChild(inp); } 
            else if (q.type === 'trivia') { q.options.filter(o => o.trim() !== '').forEach((opt, idx) => { const btn = document.createElement('button'); btn.className = 'trivia-option ' + (studentAnswers[q.id] === idx ? 'selected' : ''); btn.innerText = opt; btn.onclick = () => { studentAnswers[q.id] = idx; renderQuestions(); }; qBlock.appendChild(btn); }); }
            else if (q.type === 'order') { const items = orderStates[q.id] || []; items.forEach((item, idx) => { const row = document.createElement('div'); row.className = 'order-item'; const span = document.createElement('span'); span.innerText = item; const btns = document.createElement('div'); btns.className = 'order-btns'; const upBtn = document.createElement('button'); upBtn.innerText = '↑'; upBtn.disabled = idx === 0; upBtn.onclick = () => { let arr = orderStates[q.id]; let temp = arr[idx]; arr[idx] = arr[idx-1]; arr[idx-1] = temp; renderQuestions(); }; const downBtn = document.createElement('button'); downBtn.innerText = '↓'; downBtn.disabled = idx === items.length - 1; downBtn.onclick = () => { let arr = orderStates[q.id]; let temp = arr[idx]; arr[idx] = arr[idx+1]; arr[idx+1] = temp; renderQuestions(); }; btns.appendChild(upBtn); btns.appendChild(downBtn); row.appendChild(span); row.appendChild(btns); qBlock.appendChild(row); }); }
            const chkBtn = document.createElement('button'); chkBtn.className = 'btn'; chkBtn.innerText = 'בדוק תשובה';
            chkBtn.onclick = () => { let isCorrect = false; if (q.type === 'open') { const ans = (studentAnswers[q.id] || '').trim().toLowerCase(); const correct = (q.correctAnswer || '').trim().toLowerCase(); if (ans === correct) isCorrect = true; } else if (q.type === 'trivia') { if (studentAnswers[q.id] === q.correctAnswer) isCorrect = true; } else if (q.type === 'order') { if (JSON.stringify(orderStates[q.id]) === JSON.stringify(q.options)) isCorrect = true; }
                if (isCorrect) { solvedQuestions[q.id] = true; renderQuestions(); } else { const errEl = document.getElementById('err_' + q.id); errEl.innerText = 'שגוי, נסו שוב!'; errEl.style.display = 'block'; }
            }; qBlock.appendChild(chkBtn);
         }
         qContainer.appendChild(qBlock);
      });
      document.getElementById('finishTaskBtnContainer').style.display = allQuestionsSolved ? 'block' : 'none';
    }

    function completeStation() { solvedPointIds.push(currentActivePoint.id); initGame(); renderSuccess(); }

    function renderSuccess() {
      let rHtml = ''; let vHtml = '';
      if(currentActivePoint.questions) { const pointRewards = currentActivePoint.questions.filter(q => q.rewardChar && q.rewardChar.trim() !== '').map(q => q.rewardChar.trim()); if(pointRewards.length > 0) { rHtml = '<p style="color:#a21caf; font-size:16px; margin-bottom:5px; font-weight:bold;">צפנים שאספתם:</p><div style="display:flex; gap:10px; justify-content:center; margin-bottom:15px; flex-wrap:wrap;" dir="ltr">'; pointRewards.forEach(char => { rHtml += \`<div style="padding: 10px 20px; background:#fae8ff; border:2px solid #d946ef; border-radius:10px; font-size:20px; font-weight:900;">\${char}</div>\`; }); rHtml += '</div>'; } }
      if(currentActivePoint.vaultRewardChar && currentActivePoint.vaultRewardChar.trim() !== '') { vHtml = '<p style="color:#059669; font-size:16px; margin-bottom:5px; font-weight:bold;">חלק מהצופן לכספת הראשית!</p><div style="display:flex; justify-content:center; margin-bottom:15px;" dir="ltr"><div style="padding: 10px 20px; background:#ecfdf5; border:3px dashed #10b981; border-radius:12px; font-size:22px; font-weight:900; color:#059669;">\${currentActivePoint.vaultRewardChar}</div></div>'; }
      document.getElementById('modalBody').innerHTML = \`<div style="text-align:center; padding: 20px 0;"><div style="font-size: 60px; margin-bottom: 15px; color: var(--success);">🏆</div>\${rHtml} \${vHtml}<div style="background: #ecfdf5; border: 2px solid #34d399; color: #065f46; padding: 20px; border-radius: 16px; font-size: 18px; font-weight: bold;">\${currentActivePoint.successMessage || 'סיימתם את התחנה.'}</div></div>\`;
    }

    function openFinalDoor() {
      document.getElementById('modalTitle').innerText = 'הכספת הראשית 🏆'; document.getElementById('errorMsg').style.display = 'none';
      document.getElementById('modalBody').innerHTML = \`<div style="text-align:center;"><p style="color:#a21caf; font-size:16px; margin-bottom: 20px; font-weight:bold;">הזינו קוד סופי לפתיחה:</p><input type="text" id="finalCodeInputText" style="width:100%; max-width:300px; font-size:24px; padding:15px;" placeholder="קוד..."><button class="btn" style="background: linear-gradient(135deg, #d946ef, #a855f7); font-size:20px; padding:15px; margin-top:20px;" onclick="checkFinalCode()">פרוץ כספת 🔓</button></div>\`;
      document.getElementById('mainModal').classList.add('active');
    }

    function checkFinalCode() {
      let guess = document.getElementById('finalCodeInputText').value.trim();
      if (!finalRoomCode || guess.toLowerCase() === finalRoomCode.toLowerCase()) { document.getElementById('modalBody').innerHTML = \`<div style="text-align:center; padding:20px 0;"><div style="font-size:60px; margin-bottom:15px; animation: floatPoint 2s infinite;">🏆</div><h2 style="font-size:30px; margin-bottom:10px;">\${finalRoomMessage}</h2><p style="color:#86198f; font-size:18px; font-weight:bold;">סיימתם את המשחק!</p></div>\`; } 
      else { document.getElementById('errorMsg').innerText = 'קוד שגוי!'; document.getElementById('errorMsg').style.display = 'block'; }
    }

    function closeModal() { document.getElementById('mainModal').classList.remove('active'); }
    initGame();
  </script>
</body>
</html>`;
  };

  const handleMouseDown = (e, id) => {
    if (isPlayMode || imageType === '360') return;
    e.stopPropagation(); e.preventDefault(); setDraggingPointId(id); setSelectedPoint(id); 
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!draggingPointId || !imageContainerRef.current || isPlayMode || imageType === '360') return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 100; let y = ((e.clientY - rect.top) / rect.height) * 100;
      x = Math.max(0, Math.min(100, x)); y = Math.max(0, Math.min(100, y));
      setPoints(prevPoints => prevPoints.map(p => p.id === draggingPointId ? { ...p, x, y } : p));
    };
    const handleGlobalMouseUp = () => { if (draggingPointId) { setDraggingPointId(null); setJustDropped(true); setTimeout(() => setJustDropped(false), 100); } };
    if (draggingPointId) { window.addEventListener('mousemove', handleGlobalMouseMove); window.addEventListener('mouseup', handleGlobalMouseUp); }
    return () => { window.removeEventListener('mousemove', handleGlobalMouseMove); window.removeEventListener('mouseup', handleGlobalMouseUp); };
  }, [draggingPointId, isPlayMode, imageType]);

  const handleImageClick = (e) => {
    if (draggingPointId || justDropped || isPlayMode) return;
    let x, y;
    if (imageType === '360') {
        if (!pannellumViewerRef.current) return;
        const pitch = pannellumViewerRef.current.mouseEventToCoords(e)[0];
        const yaw = pannellumViewerRef.current.mouseEventToCoords(e)[1];
        y = ((pitch + 90) / 180) * 100; x = ((yaw + 180) / 360) * 100;
    } else {
        if (e.target !== imageContainerRef.current && e.target.tagName !== 'IMG') return;
        const rect = imageContainerRef.current.getBoundingClientRect();
        x = ((e.clientX - rect.left) / rect.width) * 100; y = ((e.clientY - rect.top) / rect.height) * 100;
    }
    const isTooClose = points.some(p => Math.abs(p.x - x) < 3 && Math.abs(p.y - y) < 3);
    if (isTooClose) { showToast('כבר קיימת תחנה קרובה. הזיזו אותה למקום אחר.'); return; }
    
    const newPoint = {
      id: generateUniqueId('p'), x, y, label: (points.length + 1).toString(), color: activeColor,
      entryPasscode: '', entryHint: '', learningText: '', mediaUrl: '',
      questions: [{ id: generateUniqueId('q'), type: 'open', text: 'שאלה חדשה:', options: ['', '', '', ''], correctAnswer: '', rewardChar: '' }],
      taskHint: '', successMessage: 'כל הכבוד!', vaultRewardChar: '',
    };
    setPoints([...points, newPoint]); setSelectedPoint(newPoint.id);
  };

  const updatePoint = (id, field, value) => setPoints(points.map(p => p.id === id ? { ...p, [field]: value } : p));
  const deletePoint = (id) => { setPoints(points.filter(p => p.id !== id)); if (selectedPoint === id) setSelectedPoint(null); };
  const addQuestion = (pointId) => setPoints(points.map(p => p.id === pointId ? { ...p, questions: [...p.questions, { id: generateUniqueId('q'), type: 'open', text: 'שאלה נוספת:', options: ['', '', '', ''], correctAnswer: '', rewardChar: '' }] } : p));
  const updateQuestion = (pointId, qId, field, value) => setPoints(points.map(p => p.id === pointId ? { ...p, questions: p.questions.map(q => q.id === qId ? { ...q, [field]: value } : q) } : p));
  const deleteQuestion = (pointId, qId) => setPoints(points.map(p => p.id === pointId ? { ...p, questions: p.questions.filter(q => q.id !== qId) } : p));
  const updateQuestionOption = (pointId, qId, index, value) => setPoints(points.map(p => p.id === pointId ? { ...p, questions: p.questions.map(q => q.id === qId ? { ...q, options: q.options.map((opt, i) => i === index ? value : opt) } : q) } : p));

  if (!isAppStarted) {
    return (
      <div className="min-h-screen flex flex-col bg-fuchsia-50" dir="rtl">
        <div className="bg-white px-6 py-8 shadow-sm z-20 flex flex-col items-center text-center border-b border-fuchsia-100 shrink-0">
          <img src="https://i.postimg.cc/DfxP89V0/Whats_App_Image_2026_03_18_at_11_10_41_1_removebg_preview.png" alt="לוגו חדר בריחה" className="h-24 w-auto mx-auto mb-4 drop-shadow-md hover:scale-105 transition-transform duration-500"/>
          <h1 className="text-4xl font-black text-fuchsia-950 mb-3 tracking-tight">מסע של מרחב בקליק</h1>
          <p className="text-fuchsia-800 text-lg max-w-2xl mx-auto font-medium leading-relaxed">הפכו כל תמונה להרפתקה. שלבו חידות טריוויה, סידור מילים, וחלקי קוד שהתלמידים יאספו בדרך אל הכספת הראשית!</p>
        </div>

        <div className="flex-1 w-full flex flex-col justify-end pb-12" style={{ backgroundImage: "url('https://i.postimg.cc/PxN2tFTF/Gemini-Generated-Image-o9wugoo9wugoo9wu.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
           {!showLoadInput ? (
             <div className="w-full flex justify-center mt-auto px-4">
               <div className="flex flex-col md:flex-row gap-4 w-full max-w-xl justify-end">
                  <button onClick={() => setIsAppStarted(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-all text-xl">
                    יצירת מסע חדש
                  </button>
                  <button onClick={() => setShowLoadInput(true)} className="bg-white hover:bg-purple-50 text-purple-700 border-2 border-purple-200 font-bold py-4 px-8 rounded-xl shadow-xl transition-all text-xl">
                    טעינת פעילות קיימת
                  </button>
               </div>
             </div>
           ) : (
             <div className="w-full flex justify-center mt-auto px-4">
               <div className="bg-white/95 p-8 rounded-3xl backdrop-blur-md shadow-2xl text-center max-w-sm w-full border-2 border-purple-200">
                  <h3 className="text-xl font-black text-purple-900 mb-4">הזינו קוד עריכה</h3>
                  <input type="text" value={loadCodeInput} onChange={e => setLoadCodeInput(e.target.value)} placeholder="למשל: A1B2C3" className="w-full text-center text-2xl font-black text-purple-900 bg-purple-50 border-2 border-purple-300 rounded-xl px-4 py-3 outline-none focus:border-purple-600 mb-4 uppercase" dir="ltr" />
                  <button onClick={handleLoadFromCloud} disabled={isLoadingCloud} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-purple-700 transition-colors mb-3 text-lg">
                    {isLoadingCloud ? 'טוען...' : 'טען משימה'}
                  </button>
                  <button onClick={() => setShowLoadInput(false)} className="text-purple-600 font-bold text-sm hover:underline">חזרה אחורה</button>
               </div>
             </div>
           )}
        </div>
      </div>
    );
  }

  if (isAppStarted && !imageSrc) {
    return (
      <div className="min-h-screen flex flex-col bg-fuchsia-50" dir="rtl">
        <header className="bg-white border-b border-fuchsia-200 p-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-black text-fuchsia-950">מסע של מרחב בקליק</h1>
          <button onClick={() => setIsAppStarted(false)} className="text-fuchsia-600 font-bold hover:underline">חזרה למסך הבית</button>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
           <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-lg w-full border-2 border-fuchsia-100">
             <div className="bg-fuchsia-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><FolderOpen size={48} className="text-fuchsia-500" /></div>
             <h2 className="text-2xl font-black text-fuchsia-950 mb-4">העלאת תמונת רקע</h2>
             <p className="text-fuchsia-700 mb-8 font-medium">בחרו האם להעלות תמונה רגילה או פנורמה היקפית 360 מעלות שעליה תבנו את הפעילות.</p>
             <div className="flex flex-col gap-4">
                <label className="cursor-pointer w-full bg-fuchsia-600 text-white font-bold py-4 rounded-xl shadow-md hover:bg-fuchsia-700 transition-colors text-lg">
                  העלאת תמונת 360 (פנורמה)
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, '360')} />
                </label>
                <label className="cursor-pointer w-full bg-white text-fuchsia-700 border-2 border-fuchsia-300 font-bold py-4 rounded-xl shadow-sm hover:bg-fuchsia-50 transition-colors text-lg">
                  העלאת תמונה רגילה (דו-מימד)
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, '2d')} />
                </label>
             </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-fuchsia-50 font-sans" dir="rtl">
      
      {toastMsg && (<div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-fuchsia-900 text-white px-8 py-4 rounded-full shadow-2xl z-[200] font-bold animate-bounce border-2 border-fuchsia-300">{toastMsg}</div>)}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border-2 border-red-100">
            <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
            <h3 className="text-2xl font-black text-red-600 mb-2">האם אתם בטוחים?</h3>
            <p className="text-gray-600 mb-6 font-medium">כל מה שלא שמרתם בענן יימחק. האם להמשיך לאיפוס וחזרה למסך הבית?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">ביטול</button>
              <button onClick={executeReset} className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition-colors border border-red-200">כן, איפוס</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-fuchsia-200 p-4 flex flex-wrap justify-between items-center gap-4 shadow-sm z-50">
        <div><h1 className="text-xl font-black text-fuchsia-950">מסע של מרחב בקליק</h1></div>
        <div className="flex gap-2 items-center flex-wrap">
          {!isPlayMode ? (
            <>
              <button onClick={handleSaveToCloud} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors text-sm">
                <Save size={16} /> {isSaving ? 'שומר...' : 'שמירה בענן (קוד)'}
              </button>
              <label className="cursor-pointer bg-fuchsia-50 text-fuchsia-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-fuchsia-200 hover:bg-fuchsia-100 transition-colors text-sm">
                <ImageIcon size={16} /> החלפת תמונה <input type="file" accept="image/*" className="hidden" onChange={handleChangeImage} />
              </label>
              <button onClick={() => setShowResetConfirm(true)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-red-200 hover:bg-red-100 transition-colors text-sm">
                <Trash2 size={16} /> איפוס וחזרה
              </button>
              <div className="w-px h-6 bg-fuchsia-200 mx-2"></div>
              <button onClick={() => { setIsPlayMode(true); }} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 shadow-sm transition-colors text-sm">
                <PlayCircle size={16} /> תצוגה מקדימה
              </button>
              <button onClick={() => setIsExportModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-sm transition-colors text-sm">
                <Share2 size={16} /> ייצוא ל-Sites
              </button>
            </>
          ) : (
            <button onClick={() => setIsPlayMode(false)} className="bg-white text-fuchsia-700 border border-fuchsia-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-fuchsia-50 transition-colors">
              <Edit3 size={16} /> חזור לעריכה
            </button>
          )}
        </div>
      </header>

      {savedCodeInfo && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4 backdrop-blur-sm">
             <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border-2 border-purple-200">
                <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} /></div>
                <h3 className="text-2xl font-black text-purple-900 mb-2">נשמר בהצלחה!</h3>
                <p className="text-purple-700 mb-4">קוד העריכה שלכם לעתיד הוא:</p>
                <div className="text-4xl font-black text-fuchsia-600 bg-fuchsia-50 py-3 rounded-xl border-2 border-fuchsia-200 mb-6 tracking-widest" dir="ltr">{savedCodeInfo}</div>
                <button onClick={() => setSavedCodeInfo(null)} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl">הבנתי, תודה!</button>
             </div>
          </div>
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 bg-fuchsia-950/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-fuchsia-100 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-fuchsia-100 bg-fuchsia-50/50">
              <h3 className="text-xl font-black text-fuchsia-900">ייצוא ל-Google Sites</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-fuchsia-400 hover:text-fuchsia-700 bg-white shadow-sm w-8 h-8 rounded-full flex justify-center items-center transition-colors"><X size={18} /></button>
            </div>
            <div className="p-8">
              <button onClick={() => {
                  const textArea = document.createElement("textarea"); textArea.value = getGameHTML();
                  document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);
                  showToast('הקוד הועתק! עכשיו עברו ל-Google Sites והדביקו בעזרת חלונית "הטמעה".'); setIsExportModalOpen(false);
              }} className="w-full flex items-center justify-center gap-5 p-5 border-2 border-orange-200 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-all group shadow-sm">
                <div className="bg-orange-500 text-white p-3.5 rounded-xl group-hover:scale-110 transition-transform shadow-md shadow-orange-500/20"><Code size={28} /></div>
                <div className="text-right">
                  <div className="font-black text-orange-900 text-xl mb-1">העתקת קוד להטמעה (Embed)</div>
                  <div className="text-sm text-orange-800 font-medium">מעתיק את המשחק במלואו להדבקה באתר.</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="bg-white rounded-3xl shadow-xl border border-fuchsia-100 overflow-hidden flex flex-col relative pb-4">
             {!isPlayMode && (
               <div className="bg-purple-50 border-b border-purple-100 p-3 text-center text-purple-800 font-bold text-sm">הקליקו על התמונה כדי להוסיף תחנה, וגררו אותה למיקום הרצוי.</div>
             )}
             <div className="relative w-full min-h-[50vh] md:h-[65vh] bg-gray-100 flex items-center justify-center overflow-hidden">
                {imageType === '360' ? (
                   <div id="pannellum-editor" className="w-full h-full" dir="ltr" onClick={handleImageClick}></div>
                ) : (
                   <div ref={imageContainerRef} className="relative inline-block max-w-full max-h-full cursor-crosshair shadow-lg border-4 border-white" onClick={handleImageClick}>
                      <img src={imageSrc} alt="פעילות" className="max-w-full max-h-full object-contain pointer-events-none" />
                      {points.map((point) => (
                          <div key={point.id} className={`absolute z-10 cursor-grab ${selectedPoint === point.id ? 'z-20' : ''}`}
                            style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
                            onMouseDown={(e) => handleMouseDown(e, point.id)} onClick={(e) => { e.stopPropagation(); setSelectedPoint(point.id); }}
                          >
                             <div className={`rounded-full flex items-center justify-center text-white font-bold border-2 border-white px-3 py-1 min-w-[44px] h-[44px] shadow-md transition-transform ${selectedPoint === point.id ? 'ring-4 ring-offset-2 ring-fuchsia-400 scale-110' : ''}`} style={{ backgroundColor: point.color, whiteSpace: 'nowrap' }}>
                               {point.label}
                             </div>
                          </div>
                      ))}
                   </div>
                )}
             </div>
             
             {!isPlayMode && imageType === '2d' && (
                <div className="p-4 flex justify-center gap-2 bg-white">
                  {PREDEFINED_COLORS.map(color => ( <button key={color} onClick={() => setActiveColor(color)} className={`w-8 h-8 rounded-full border-2 ${activeColor === color ? 'scale-125 border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: color }} /> ))}
                </div>
             )}
          </div>

          {!isPlayMode && selectedPoint && (() => {
             const currentPointData = points.find(p => p.id === selectedPoint);
             if(!currentPointData) return null;
             return (
               <div className="bg-white rounded-3xl shadow-2xl border-2 p-6 md:p-8" style={{ borderColor: currentPointData.color }}>
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                    <h3 className="font-black text-2xl">עריכת תחנה: {currentPointData.label}</h3>
                    <button onClick={() => deletePoint(currentPointData.id)} className="text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100">מחיקת תחנה</button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                       <label className="block font-bold text-purple-900 mb-2">שם/תווית לנקודה (טקסט או מספר):</label>
                       <input type="text" value={currentPointData.label} onChange={(e) => updatePoint(currentPointData.id, 'label', e.target.value)} className="w-full bg-white border-2 border-purple-200 rounded-xl px-4 py-3 outline-none font-bold text-lg" placeholder="למשל: חידת מדעים, או 1" />
                    </div>
                    
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                       <label className="block font-bold text-blue-900 mb-2">קוד כניסה לתחנה (השאירו ריק אם פתוח מראש):</label>
                       <input type="text" value={currentPointData.entryPasscode} onChange={(e) => updatePoint(currentPointData.id, 'entryPasscode', e.target.value)} className="w-full bg-white border-2 border-blue-200 rounded-xl px-4 py-2 outline-none font-bold" />
                    </div>

                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                       <label className="block font-bold text-amber-900 mb-2">קישור ליוטיוב / קוד הטמעה מקנבה (Canva) / תמונה:</label>
                       <textarea rows="2" value={currentPointData.mediaUrl} onChange={(e) => updatePoint(currentPointData.id, 'mediaUrl', e.target.value)} className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-3 outline-none font-mono text-sm" placeholder="הדביקו כאן את קוד ההטמעה (Iframe/Div) או קישור רגיל..." dir="ltr" />
                       <label className="block font-bold text-amber-900 mt-4 mb-2">טקסט למידה:</label>
                       <textarea rows="3" value={currentPointData.learningText} onChange={(e) => updatePoint(currentPointData.id, 'learningText', e.target.value)} className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-3 outline-none" />
                    </div>

                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                       <h4 className="font-black text-emerald-900 text-lg mb-4">שאלות ומשימות:</h4>
                       {currentPointData.questions.map((q, qIndex) => (
                          <div key={q.id} className="bg-white p-4 rounded-xl border border-emerald-200 mb-4 shadow-sm relative">
                             <button onClick={() => deleteQuestion(currentPointData.id, q.id)} className="absolute top-4 left-4 text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                             <label className="block text-sm font-bold text-emerald-800 mb-1">סוג השאלה:</label>
                             <select value={q.type} onChange={(e) => updateQuestion(currentPointData.id, q.id, 'type', e.target.value)} className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-xl px-3 py-2 mb-3 outline-none font-bold">
                               <option value="open">טקסט חופשי</option><option value="trivia">טריוויה (בחירה מרובה)</option><option value="order">סידור פריטים</option>
                             </select>
                             <input type="text" value={q.text} onChange={(e) => updateQuestion(currentPointData.id, q.id, 'text', e.target.value)} className="w-full text-lg bg-white border-2 border-emerald-200 rounded-xl px-4 py-3 outline-none font-bold mb-4" placeholder="השאלה..." />
                             
                             {q.type === 'open' && ( <input type="text" value={q.correctAnswer} onChange={(e) => updateQuestion(currentPointData.id, q.id, 'correctAnswer', e.target.value)} className="w-full bg-green-50 border-2 border-green-300 rounded-xl px-4 py-3 font-bold" placeholder="תשובה נכונה..." /> )}
                             {q.type === 'trivia' && ( <div className="space-y-2 mb-4">{[0,1,2,3].map((idx) => ( <div key={idx} className="flex items-center gap-2"><input type="radio" checked={q.correctAnswer === idx} onChange={() => updateQuestion(currentPointData.id, q.id, 'correctAnswer', idx)} /><input type="text" value={q.options[idx]} onChange={(e) => updateQuestionOption(currentPointData.id, q.id, idx, e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder={`אפשרות ${idx+1}`} /></div> ))}</div> )}
                             {q.type === 'order' && ( <div className="space-y-2 mb-4">{q.options.map((opt, idx) => ( <div key={idx} className="flex items-center gap-2"><span>{idx+1}.</span><input type="text" value={opt} onChange={(e) => updateQuestionOption(currentPointData.id, q.id, idx, e.target.value)} className="flex-1 border rounded px-2 py-1" /></div> ))}</div> )}
                             
                             <div className="mt-4 pt-4 border-t border-emerald-100">
                               <label className="block text-sm font-bold text-fuchsia-800 mb-1">קוד פרס לשאלה (ללא הגבלת אורך):</label>
                               <input type="text" value={q.rewardChar || ''} onChange={(e) => updateQuestion(currentPointData.id, q.id, 'rewardChar', e.target.value)} className="w-full text-center text-xl bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl px-4 py-2 font-black uppercase" placeholder="למשל: תפוח, או A" dir="ltr" />
                             </div>
                          </div>
                       ))}
                       <button onClick={() => addQuestion(currentPointData.id)} className="w-full py-3 border-2 border-dashed border-emerald-400 rounded-xl text-emerald-700 font-black">+ הוסף שאלה</button>
                    </div>
                  </div>
               </div>
             );
          })()}

          {!isPlayMode && (
             <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-fuchsia-100 mt-8 mb-10">
                <h2 className="text-xl font-black text-fuchsia-950 mb-4 flex items-center gap-2"><Trophy size={24} className="text-yellow-500"/> הכספת הראשית</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="block font-bold mb-2">קוד סופי לניצחון (ניתן לרשום מילים):</label>
                      <input type="text" value={finalCode} onChange={(e) => setFinalCode(e.target.value)} className="w-full bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl px-4 py-3 font-bold text-center text-xl uppercase" dir="ltr" />
                   </div>
                   <div>
                      <label className="block font-bold mb-2">הודעת ניצחון:</label>
                      <textarea value={finalMessage} onChange={(e) => setFinalMessage(e.target.value)} rows="2" className="w-full bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl px-4 py-3 font-bold" />
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
