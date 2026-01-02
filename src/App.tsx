import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  arrayUnion,
  increment,
  getDoc 
} from 'firebase/firestore';
import { 
  BarChart2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Download, 
  LogOut,
  Check,
  School,
  Smartphone,
  ArrowRight,
  User,
  Hash,
  Edit3,
  X,
  HelpCircle,
  Globe,
  ChevronLeft,
  Star, 
  Trophy,
  Lock 
} from 'lucide-react';

// =================================================================
// 【重要】GitHubで編集する際も、ここをご自身のキーに書き換えてください！
// =================================================================

const firebaseConfig = {
    apiKey: "AIzaSyDlJXT3yxqitpF1FMD4BxODt_ftZKmfbS4",
    authDomain: "clicker-24540.firebaseapp.com",
    projectId: "clicker-24540",
    storageBucket: "clicker-24540.firebasestorage.app",
    messagingSenderId: "781897808192",
    appId: "1:781897808192:web:4a074430df56584efea2a5",
    measurementId: "G-6QDVWL54X9"
  }

// アプリの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// データの保存場所の名前
const appId = "my-school-clicker-v1"; 


// --- 以下、アプリの本体コード ---
export default function App() {
  const [user, setUser] = useState(null);

  // --- Persistence Logic ---
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('clicker_roomCode') || '');
  const [nickname, setNickname] = useState(() => localStorage.getItem('clicker_nickname') || '');
  const [role, setRole] = useState(() => localStorage.getItem('clicker_role') || null);
  
  // Teacher Auth State
  const [showTeacherAuth, setShowTeacherAuth] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [isRoomExisting, setIsRoomExisting] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [step, setStep] = useState(() => {
    const sRole = localStorage.getItem('clicker_role');
    const sCode = localStorage.getItem('clicker_roomCode');
    const sNick = localStorage.getItem('clicker_nickname');
    if (sRole === 'teacher' && sCode) return 'room';
    if (sRole === 'student' && sCode && sNick) return 'room';
    if (sRole === 'student' && sCode) return 'nickname';
    return 'lobby';
  });

  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
        console.error("Auth Error", error);
    });
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleTeacherClick = async () => {
    if (!roomCode.trim()) return;
    const formattedCode = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(formattedCode);
    setAuthError('');
    setTeacherPassword('');

    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', formattedCode);
      const snap = await getDoc(roomRef);
      
      setIsRoomExisting(snap.exists());
      setShowTeacherAuth(true);
    } catch (e) {
      console.error(e);
      alert("Error checking room. Please try again.");
    }
  };

  const submitTeacherAuth = async () => {
    if (!teacherPassword.trim()) {
        setAuthError("Password is required / パスワードを入力してください");
        return;
    }

    const formattedCode = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', formattedCode);

    if (isRoomExisting) {
        const snap = await getDoc(roomRef);
        const data = snap.data();

        if (data && !data.adminPassword) {
             try {
                 await updateDoc(roomRef, { adminPassword: teacherPassword });
                 handleRoleSelect('teacher');
                 setShowTeacherAuth(false);
             } catch(e) {
                 setAuthError("Error updating password");
             }
             return;
        }

        if (snap.exists() && data.adminPassword === teacherPassword) {
            handleRoleSelect('teacher');
            setShowTeacherAuth(false);
        } else {
            setAuthError("Wrong Password / パスワードが違います");
        }
    } else {
        try {
            await setDoc(roomRef, {
                status: 'voting', 
                currentQuestion: 1,
                createdAt: serverTimestamp(),
                responses: {},
                history: [],
                correctAnswer: null,
                adminPassword: teacherPassword
            });
            handleRoleSelect('teacher');
            setShowTeacherAuth(false);
        } catch(e) {
            console.error(e);
            setAuthError("Error creating room");
        }
    }
  };

  const handleRoleSelect = (selectedRole) => {
    if (!roomCode.trim()) return;
    const formattedCode = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    localStorage.setItem('clicker_roomCode', formattedCode);
    localStorage.setItem('clicker_role', selectedRole);
    setRoomCode(formattedCode);
    setRole(selectedRole);
    setStep(selectedRole === 'student' ? 'nickname' : 'room');
  };

  const handleJoinRoom = () => {
    if (role === 'student' && !nickname.trim()) return;
    if (role === 'student') localStorage.setItem('clicker_nickname', nickname);
    setStep('room');
  };

  const handleLogout = () => {
    localStorage.removeItem('clicker_roomCode');
    localStorage.removeItem('clicker_role');
    localStorage.removeItem('clicker_nickname');
    setStep('lobby');
    setRole(null);
    setRoomCode('');
    setNickname('');
    setShowTeacherAuth(false);
  };

  if (!user) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium tracking-wider animate-pulse">SYSTEM LOADING</p>
        </div>
      </div>
    );
  }

  // --- UI Components ---

  // Teacher Auth Modal
  if (showTeacherAuth) {
      return (
        <div className="min-h-[100dvh] w-full bg-slate-100 flex flex-col md:items-center md:justify-center p-0 md:p-6">
            <div className="bg-white w-full h-[100dvh] md:h-auto md:max-w-sm p-8 md:rounded-3xl md:shadow-xl md:border md:border-slate-200 flex flex-col justify-center">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">
                        {isRoomExisting ? "Teacher Login" : "Create Class Room"}
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                        {isRoomExisting 
                            ? "Enter the room password to manage." 
                            : "Set a password for this new room."}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Room Code</label>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-center text-lg text-slate-700">
                            {roomCode}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            {isRoomExisting ? "Password" : "Set Password"}
                        </label>
                        <input 
                            type="password"
                            value={teacherPassword}
                            onChange={(e) => setTeacherPassword(e.target.value)}
                            placeholder="****"
                            className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-bold text-center text-lg text-slate-800"
                            autoFocus
                        />
                        {authError && <p className="text-red-500 text-xs font-bold mt-2 text-center">{authError}</p>}
                    </div>

                    <button
                        onClick={submitTeacherAuth}
                        className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-500/30 transition-all"
                    >
                        {isRoomExisting ? "Login" : "Create & Enter"}
                    </button>
                    
                    <button 
                        onClick={() => setShowTeacherAuth(false)}
                        className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // Guide / Help Screen
  if (step === 'guide') {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center p-0 md:p-6 overflow-y-auto">
        <div className="w-full md:max-w-2xl min-h-[100dvh] md:min-h-0 bg-white md:rounded-3xl md:shadow-xl md:border border-slate-200 overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white relative flex-shrink-0">
            <button 
              onClick={() => setStep('lobby')}
              className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="text-center mt-2">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <HelpCircle className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold">How to Use</h1>
              <p className="text-indigo-100 text-sm font-medium">使い方の説明 / 사용법 안내</p>
            </div>
          </div>

          <div className="p-8 space-y-8 flex-grow">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">1</div>
              <div className="space-y-3 pt-1 w-full">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-500"/> Room Code
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl">
                  <div>
                    <span className="block font-bold text-xs text-indigo-500 mb-1">JAPANESE</span>
                    先生と学生で同じ「ルームコード（部屋番号）」を入力します。例：CLASS101
                  </div>
                  <div className="md:border-l border-slate-200 md:pl-4 border-t md:border-t-0 pt-3 md:pt-0">
                    <span className="block font-bold text-xs text-indigo-500 mb-1">KOREAN</span>
                    선생님과 학생은 동일한 「룸 코드(방 번호)」를 입력합니다. 예: CLASS101
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">2</div>
              <div className="space-y-3 pt-1 w-full">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-500"/> Student (学生 / 학생)
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl">
                  <div>
                    <span className="block font-bold text-xs text-indigo-500 mb-1">JAPANESE</span>
                    「Student」を選び、ニックネームを入力して参加します。先生が出題したら、<span className="font-bold text-indigo-600">1〜5</span>の選択肢から投票します。
                  </div>
                  <div className="md:border-l border-slate-200 md:pl-4 border-t md:border-t-0 pt-3 md:pt-0">
                    <span className="block font-bold text-xs text-indigo-500 mb-1">KOREAN</span>
                    'Student'를 선택하고 닉네임을 입력해 참여합니다. 선생님이 문제를 내면 <span className="font-bold text-indigo-600">1~5</span> 선택지 중 하나에 투표하세요.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold shrink-0">3</div>
              <div className="space-y-3 pt-1 w-full">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <School className="w-4 h-4 text-teal-500"/> Teacher (先生 / 선생님)
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl">
                  <div>
                    <span className="block font-bold text-xs text-indigo-500 mb-1">JAPANESE</span>
                    「Teacher」を選び、部屋を作成します。リアルタイムで集計結果を確認・公開したり、次の問題へ進むことができます。
                  </div>
                  <div className="md:border-l border-slate-200 md:pl-4 border-t md:border-t-0 pt-3 md:pt-0">
                    <span className="block font-bold text-xs text-indigo-500 mb-1">KOREAN</span>
                    'Teacher'를 선택해 방을 만듭니다. 실시간으로 집계 결과를 확인 및 공개하거나, 다음 문제로 진행할 수 있습니다.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 text-center border-t border-slate-100 flex-shrink-0">
            <button 
              onClick={() => setStep('lobby')}
              className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
            >
              OK, I understand
            </button>
          </div>

        </div>
        <footer className="mt-8 text-xs font-medium text-slate-400 tracking-wide md:block hidden">
          Created by Akihiro Suwa (BUFS)
        </footer>
      </div>
    );
  }
  
  // Lobby Screen (Fixed for Mobile Fullscreen)
  if (step === 'lobby') {
    return (
      <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col md:items-center md:justify-center p-0 md:p-6">
        <div className="bg-white/80 backdrop-blur-xl w-full h-[100dvh] md:h-auto md:max-w-md p-8 md:p-12 md:rounded-3xl md:shadow-2xl md:border border-white/50 flex flex-col justify-center">
          <div className="text-center mb-10 relative">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">Clicker<span className="text-indigo-600">.io</span></h1>
            <p className="text-slate-500 font-medium">Interactive Classroom System</p>
            
            {/* Guide Button */}
            <button 
              onClick={() => setStep('guide')}
              className="absolute top-0 right-0 md:-right-4 md:-top-4 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
              title="How to use / 사용법"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="ROOM CODE"
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xl font-bold tracking-widest text-center uppercase transition-all text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => handleRoleSelect('student')}
                disabled={!roomCode}
                className="group relative flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <div className="absolute inset-0 bg-indigo-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Smartphone className="w-8 h-8 text-slate-600 group-hover:text-indigo-600 mb-3 relative z-10 transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-indigo-700 relative z-10">Student</span>
              </button>

              <button
                onClick={handleTeacherClick} 
                disabled={!roomCode}
                className="group relative flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-teal-500 hover:shadow-lg hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <div className="absolute inset-0 bg-teal-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <School className="w-8 h-8 text-slate-600 group-hover:text-teal-600 mb-3 relative z-10 transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-teal-700 relative z-10">Teacher</span>
              </button>
            </div>
          </div>
          
          <footer className="mt-8 text-xs font-medium text-slate-400 tracking-wide text-center md:hidden">
            Created by Akihiro Suwa (BUFS)
          </footer>
        </div>
        <footer className="mt-8 text-xs font-medium text-slate-400 tracking-wide hidden md:block">
          Created by Akihiro Suwa (BUFS)
        </footer>
      </div>
    );
  }

  // Nickname Screen (Fixed for Mobile Fullscreen)
  if (step === 'nickname') {
    return (
      <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col md:items-center md:justify-center p-0 md:p-6">
        <div className="bg-white/80 backdrop-blur-xl w-full h-[100dvh] md:h-auto md:max-w-md p-8 md:rounded-3xl md:shadow-2xl md:border border-white/50 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Who are you?</h2>
            <p className="text-slate-500 text-sm mt-1">Please enter your display name</p>
          </div>
          
          <div className="space-y-4">
            <div className="relative group">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nickname"
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-lg font-medium transition-all text-slate-800"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && handleJoinRoom()}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={!nickname.trim()}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              Join Room
            </button>
            
            <button 
              onClick={() => {
                setStep('lobby');
                localStorage.removeItem('clicker_role');
                localStorage.removeItem('clicker_roomCode');
              }}
              className="w-full py-2 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Back to Lobby
            </button>
          </div>
          <footer className="mt-8 text-xs font-medium text-slate-400 tracking-wide text-center md:hidden">
            Created by Akihiro Suwa (BUFS)
          </footer>
        </div>
        <footer className="mt-8 text-xs font-medium text-slate-400 tracking-wide hidden md:block">
          Created by Akihiro Suwa (BUFS)
        </footer>
      </div>
    );
  }

  return (
    <Room 
      user={user} 
      roomCode={roomCode} 
      role={role} 
      nickname={nickname}
      onLogout={handleLogout} 
      db={db}
      appId={appId}
    />
  );
}

// --- Room Component ---
function Room({ user, roomCode, role, nickname, onLogout, db, appId }) {
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingQ, setIsEditingQ] = useState(false);
  const [editQVal, setEditQVal] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showNextConfirm, setShowNextConfirm] = useState(false);

  useEffect(() => {
    if (!user || !roomCode) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', roomCode);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      setRoomData(docSnap.exists() ? docSnap.data() : null);
      setLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, roomCode, db, appId]);

  useEffect(() => {
    // 既存のuseEffect (初期化処理) はTeacher Authで代替されたため削除または空にします
  }, [role, loading, roomData, db, appId, roomCode]);

  // Actions
  const submitVote = async (option) => {
    if (!roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', roomCode);
    const newResponses = {
      ...roomData.responses,
      [user.uid]: {
        option: option,
        timestamp: new Date().toISOString(),
        nickname: nickname,
        question: roomData.currentQuestion || 1
      }
    };
    await updateDoc(roomRef, { responses: newResponses });
  };

  const toggleStatus = async () => {
    if (!roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', roomCode);
    const newStatus = roomData.status === 'voting' ? 'revealed' : 'voting';
    await updateDoc(roomRef, { status: newStatus });
  };

  const handleNextQuestion = async () => {
    if (!roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', roomCode);
    const historyEntry = {
      question: roomData.currentQuestion || 1,
      responses: roomData.responses || {},
      timestamp: new Date().toISOString(),
      correctAnswer: roomData.correctAnswer || null
    };
    await updateDoc(roomRef, { 
      status: 'voting',
      responses: {}, 
      currentQuestion: increment(1), 
      history: arrayUnion(historyEntry),
      correctAnswer: null 
    });
    setShowNextConfirm(false);
  };

  const resetRoom = async () => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', roomCode);
    await updateDoc(roomRef, { 
      status: 'voting', 
      currentQuestion: 1, 
      responses: {}, 
      history: [],
      correctAnswer: null 
    });
    setShowResetConfirm(false);
  };

  const toggleCorrectAnswer = async (option) => {
    if (!roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', roomCode);
    const newCorrect = roomData.correctAnswer === option ? null : option;
    await updateDoc(roomRef, { correctAnswer: newCorrect });
  };

  const updateQuestionNumber = async () => {
    if (!roomData || !editQVal) return;
    const num = parseInt(editQVal);
    if (isNaN(num) || num < 1) return;
    
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'clicker_rooms', roomCode);
    await updateDoc(roomRef, { currentQuestion: num });
    setIsEditingQ(false);
  };

  const downloadCSV = () => {
    if (!roomData) return;
    
    let csvContent = "\uFEFF"; 
    csvContent += "Question,Nickname,Option,Result,Time,UserID\n";

    const addRows = (responses, qNum, qCorrectAnswer) => {
      Object.entries(responses).forEach(([uid, data]) => {
        if (!data || typeof data !== 'object') return;

        const safeName = data.nickname ? data.nickname.replace(/,/g, '') : 'No Name';
        
        let localTime = "";
        try {
            const dateObj = new Date(data.timestamp);
            if (!isNaN(dateObj.getTime())) {
                localTime = dateObj.toLocaleString('ja-JP', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                });
            } else {
                localTime = data.timestamp || "";
            }
        } catch(e) {
            localTime = data.timestamp || "";
        }

        let resultStr = "-";
        if (qCorrectAnswer) {
            resultStr = (data.option === qCorrectAnswer) ? "Correct" : "Incorrect";
        }

        csvContent += `${qNum},${safeName},${data.option},${resultStr},"${localTime}",${uid}\n`;
      });
    };

    if (roomData.history && Array.isArray(roomData.history)) {
      roomData.history.forEach(entry => addRows(entry.responses, entry.question, entry.correctAnswer));
    }
    if (roomData.responses) {
      addRows(roomData.responses, roomData.currentQuestion || 1, roomData.correctAnswer);
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const today = new Date().toISOString().slice(0,10);
    link.setAttribute("download", `clicker_results_${roomCode}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const counts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let total = 0;
    if (roomData && roomData.responses) {
      Object.values(roomData.responses).forEach(r => {
        if (counts[r.option] !== undefined) {
          counts[r.option]++;
          total++;
        }
      });
    }
    return { counts, total };
  }, [roomData]);

  if (loading) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 text-slate-400">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (role === 'student' && !roomData) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-0 md:p-6 text-center">
        <div className="bg-white w-full h-[100dvh] md:h-auto md:p-8 rounded-none md:rounded-3xl shadow-none md:shadow-xl max-w-none md:max-w-sm flex flex-col justify-center p-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <School className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Waiting for Teacher</h2>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
             <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Room Code</p>
             <p className="text-2xl font-mono font-bold text-indigo-600 tracking-widest">{roomCode}</p>
          </div>
          <button onClick={onLogout} className="mt-8 text-sm font-medium text-slate-400 hover:text-slate-600">Exit Room</button>
          <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-slate-300 md:hidden">Created by Akihiro Suwa (BUFS)</footer>
        </div>
        <footer className="absolute bottom-6 text-xs text-slate-300 hidden md:block">Created by Akihiro Suwa (BUFS)</footer>
      </div>
    );
  }

  if (role === 'teacher' && !roomData) {
     return (
       <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
         <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
         <h2 className="text-lg font-bold text-slate-700">Creating Room...</h2>
       </div>
     );
  }

  const isTeacher = role === 'teacher';
  const isRevealed = roomData.status === 'revealed';
  const currentQ = roomData.currentQuestion || 1;
  const myVote = roomData.responses?.[user.uid]?.option;
  const correctAnswer = roomData.correctAnswer;

  const themeColor = isTeacher ? 'teal' : 'indigo';
  const gradientClass = isTeacher ? 'from-teal-600 to-emerald-600' : 'from-indigo-600 to-purple-600';

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* --- CONFIRMATION MODALS --- */}
      {showNextConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Next Question?</h3>
            <p className="text-slate-500 text-sm mb-6">Current votes will be archived and the question number will advance to {currentQ + 1}.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowNextConfirm(false)} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleNextQuestion} className="flex-1 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors">Proceed</button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-red-600 mb-2">Reset Session?</h3>
            <p className="text-slate-500 text-sm mb-6">This will delete all history and reset the question counter to 1. <b>This action cannot be undone.</b></p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
              <button onClick={resetRoom} className="flex-1 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">Reset All</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT QUESTION MODAL --- */}
      {isEditingQ && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Jump to Question</h3>
              <button onClick={() => setIsEditingQ(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <input 
              type="number" 
              value={editQVal}
              onChange={(e) => setEditQVal(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-center text-2xl outline-none focus:border-teal-500 mb-4 text-slate-800"
              min="1"
              autoFocus
            />
            <button onClick={updateQuestionNumber} className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors">
              Set Number
            </button>
          </div>
        </div>
      )}


      {/* --- Stylish Header --- */}
      <header className={`bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white shadow-lg shadow-${themeColor}-500/20 flex-shrink-0`}>
              {isTeacher ? <School className="w-5 h-5"/> : <Smartphone className="w-5 h-5"/>}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg leading-none flex items-center gap-2">
                <span className="truncate">{isTeacher ? 'Admin Dashboard' : 'Voting Terminal'}</span>
                
                {/* Question Badge - Clickable for Teacher */}
                {isTeacher ? (
                  <button 
                    onClick={() => { setEditQVal(currentQ.toString()); setIsEditingQ(true); }}
                    className={`group flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-${themeColor}-50 text-${themeColor}-700 border border-${themeColor}-100 hover:bg-${themeColor}-100 transition-colors`}
                    title="Click to change question number"
                  >
                    Q{currentQ} <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <span className={`px-2 py-0.5 rounded-md text-xs font-mono bg-${themeColor}-50 text-${themeColor}-700 border border-${themeColor}-100`}>Q{currentQ}</span>
                )}
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1 truncate font-mono">
                {roomCode} <span className="text-slate-300">|</span> {nickname || 'Admin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                roomData.status === 'voting' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${roomData.status === 'voting' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}></div>
                {roomData.status === 'voting' ? 'LIVE' : 'RESULTS'}
             </div>
            <button 
              onClick={onLogout} 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-grow p-4 md:p-8 w-full max-w-5xl mx-auto">
        
        {/* --- TEACHER DASHBOARD --- */}
        {isTeacher && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            {/* Stats Card */}
            <div className="md:col-span-8 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Responses</p>
                  <div className="text-5xl font-black text-slate-800 tracking-tighter">{stats.total}</div>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Status</p>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                    roomData.status === 'voting' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {roomData.status === 'voting' ? 'Voting Open' : 'Results Visible'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={toggleStatus}
                  className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] ${
                    isRevealed 
                      ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-500/30' 
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/30'
                  }`}
                >
                  {isRevealed ? <><EyeOff className="w-5 h-5"/> Hide Results</> : <><Eye className="w-5 h-5"/> Show Results</>}
                </button>

                <button 
                  onClick={() => setShowNextConfirm(true)}
                  className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 shadow-lg shadow-teal-500/30 transition-all active:scale-[0.98]"
                >
                  Next Q <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Utility Card */}
            <div className="md:col-span-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col gap-3 justify-center">
               <p className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center mb-2">Session Tools</p>
               <button 
                  onClick={downloadCSV}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> Save CSV
                </button>
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-100 rounded-xl font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Reset All
                </button>
            </div>
          </div>
        )}

        {/* --- STUDENT INPUT --- */}
        {!isTeacher && roomData.status === 'voting' && (
          <div className="w-full max-w-md mx-auto py-4">
             <div className="text-center mb-8">
               <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-2 border border-indigo-100">QUESTION {currentQ}</span>
               <h2 className="text-3xl font-bold text-slate-800">Cast Your Vote</h2>
             </div>
             
             <div className="space-y-3">
               {['1', '2', '3', '4', '5'].map((option) => {
                 const isSelected = myVote === option;
                 return (
                   <button
                     key={option}
                     onClick={() => submitVote(option)}
                     className={`
                       relative w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-300 group
                       ${isSelected 
                         ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 scale-[1.02]' 
                         : 'bg-white text-slate-700 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-md'}
                     `}
                   >
                     <div className="flex items-center gap-4">
                       <div className={`
                         w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-colors
                         ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600'}
                       `}>
                         {option}
                       </div>
                       <span className="text-xl font-bold tracking-wide">Option {option}</span>
                     </div>
                     {isSelected && (
                        <div className="bg-white/20 rounded-full p-1">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                     )}
                   </button>
                 );
               })}
             </div>
             {myVote && (
               <div className="mt-6 text-center animate-bounce">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                    <Check className="w-4 h-4" /> Vote Submitted
                  </span>
               </div>
             )}
          </div>
        )}

        {/* --- RESULTS GRAPH --- */}
        {(isTeacher || (isRevealed && roomData.status === 'revealed')) && (
          <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${isTeacher ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600'}`}>
                   <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Results</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Question {currentQ}</p>
                </div>
              </div>
              {!isTeacher && myVote && (
                <div className="text-right">
                  <span className="block text-xs text-slate-400 font-bold uppercase">You Voted</span>
                  <span className="text-xl font-black text-indigo-600">{myVote}</span>
                </div>
              )}
            </div>
            
            <div className="h-64 md:h-80 flex items-end justify-between gap-2 md:gap-6 px-2 pb-2">
              {['1', '2', '3', '4', '5'].map((opt, index) => {
                const count = stats.counts[opt];
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                
                // --- Correct Answer Logic ---
                const isCorrect = correctAnswer === opt;
                
                // Fancy gradients for bars
                const gradients = [
                  'from-rose-400 to-red-500',
                  'from-blue-400 to-indigo-500',
                  'from-emerald-400 to-teal-500',
                  'from-amber-400 to-orange-500',
                  'from-violet-400 to-purple-500'
                ];
                
                const barGradient = isCorrect ? 'from-green-400 to-emerald-500 shadow-emerald-500/50' : gradients[index];
                
                return (
                  <div key={opt} className="flex flex-col items-center flex-1 h-full group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 bg-slate-800 text-white text-xs font-bold py-1 px-3 rounded-lg shadow-xl whitespace-nowrap z-20 pointer-events-none">
                       {count} Votes ({Math.round(percentage)}%)
                       <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                    </div>

                    <div className="relative flex-1 w-full flex items-end justify-center bg-slate-50 rounded-2xl overflow-hidden">
                      {/* Bar */}
                      <div 
                        className={`w-full max-w-[50px] md:max-w-[70px] rounded-t-xl bg-gradient-to-t ${barGradient} shadow-lg transition-all duration-1000 ease-out relative hover:brightness-110`}
                        style={{ height: `${percentage === 0 ? 2 : percentage}%` }}
                      >
                         <div className="absolute inset-0 bg-white/20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
                         {/* Correct Star on Bar */}
                         {isCorrect && (
                           <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                             <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-sm" />
                           </div>
                         )}
                      </div>
                    </div>
                    
                    {/* Label */}
                    <div className="mt-4 flex flex-col items-center">
                      <button
                        onClick={() => isTeacher && toggleCorrectAnswer(opt)}
                        disabled={!isTeacher}
                        className={`
                          relative w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-all
                          ${isCorrect 
                             ? 'bg-green-100 border-2 border-green-500 text-green-700 scale-110 shadow-green-200' 
                             : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-slate-300'
                          }
                          ${isTeacher ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'}
                        `}
                      >
                        {opt}
                        {isTeacher && !isCorrect && (
                          <span className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-800 text-white px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                            Mark Correct
                          </span>
                        )}
                      </button>
                      <div className="mt-1 text-lg font-bold text-slate-700">{count}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Answer Feedback for Student */}
            {!isTeacher && isRevealed && correctAnswer && (
               <div className={`mt-6 p-4 rounded-xl text-center border-2 animate-in zoom-in duration-300 ${myVote === correctAnswer ? 'bg-green-50 border-green-100' : 'bg-rose-50 border-rose-100'}`}>
                  {myVote === correctAnswer ? (
                    <div className="text-green-700 flex flex-col items-center">
                       <div className="p-2 bg-green-100 rounded-full mb-2"><Trophy className="w-6 h-6 text-green-600" /></div>
                       <span className="font-black text-xl">正解 / Correct!</span>
                       <span className="text-sm opacity-80">おめでとうございます！</span>
                    </div>
                  ) : (
                    <div className="text-rose-700 flex flex-col items-center">
                       <span className="font-bold text-lg">Don't worry!</span>
                       <span className="text-sm opacity-80">Correct answer was {correctAnswer}</span>
                    </div>
                  )}
               </div>
            )}
            
            {/* Answer Set Hint for Teacher */}
            {isTeacher && !correctAnswer && (
              <p className="mt-4 text-center text-xs text-slate-400 animate-pulse">
                Click a letter button above to mark it as the correct answer.
              </p>
            )}

            {stats.total === 0 && (
               <div className="mt-4 p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">Waiting for responses...</p>
               </div>
            )}
          </div>
        )}

        {/* Student waiting screen for results */}
        {!isTeacher && !isRevealed && myVote && (
           <div className="mt-12 bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/50 text-center shadow-xl max-w-sm mx-auto">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <BarChart2 className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Vote Recorded</h3>
              <p className="text-slate-500 mt-2">Waiting for teacher to reveal results...</p>
           </div>
        )}

      </main>

      <footer className="py-6 text-center text-xs font-semibold text-slate-300 tracking-widest uppercase">
        Created by Akihiro Suwa (BUFS)
      </footer>
    </div>
  );
}
