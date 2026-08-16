import { useState, useEffect, useCallback } from "react";

// ===== 색상 =====
const C = {
  bg: "#0e1726",
  panel: "#16233a",
  cell: "#233250",
  cellBorder: "#2e4368",
  me: "#3b8ade",
  goal: "#efb027",
  goalText: "#412402",
  bomb: "#e24b4a",
  text: "#eaf0fa",
  sub: "#9db3d0",
  accent: "#3b8ade",
  green: "#4fb477",
  red: "#e24b4a",
};

const SIZE = 6;
const START_LIVES = 3;
const PREVIEW_MS = 2000;

// 판별 폭탄 개수: 2판마다 1개씩 증가 (시작 4개)
function bombCountForLevel(level) {
  return 4 + Math.floor(level / 2);
}

function makeStage(level) {
  const target = bombCountForLevel(level);
  const bombs = new Set();
  const start = 0;
  const goal = SIZE * SIZE - 1;
  while (bombs.size < target) {
    const i = Math.floor(Math.random() * SIZE * SIZE);
    if (i === start || i === goal) continue;
    bombs.add(i);
  }
  return bombs;
}

export default function App() {
  const [screen, setScreen] = useState("home"); // home | play | gameover
  const [level, setLevel] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [pos, setPos] = useState(0); // 내 위치 index
  const [bombs, setBombs] = useState(new Set());
  const [revealed, setRevealed] = useState(true);
  const [msg, setMsg] = useState("");
  const [best, setBest] = useState(0);

  const goalIdx = SIZE * SIZE - 1;

  // 최고 기록 불러오기
  useEffect(() => {
    try {
      const v = localStorage.getItem("bomb_best");
      if (v) setBest(parseInt(v, 10) || 0);
    } catch (e) {}
  }, []);

  const saveBest = useCallback((lv) => {
    setBest((prev) => {
      if (lv > prev) {
        try { localStorage.setItem("bomb_best", String(lv)); } catch (e) {}
        return lv;
      }
      return prev;
    });
  }, []);

  const startStage = useCallback((lv) => {
    setPos(0);
    setBombs(makeStage(lv));
    setRevealed(true);
    setMsg("폭탄 위치를 외우세요...");
    const t = setTimeout(() => {
      setRevealed(false);
      setMsg("목표까지 가세요");
    }, PREVIEW_MS);
    return () => clearTimeout(t);
  }, []);

  const startGame = useCallback(() => {
    setLevel(0);
    setLives(START_LIVES);
    setScreen("play");
    startStage(0);
  }, [startStage]);

  const move = useCallback((dr, dc) => {
    if (screen !== "play" || revealed) return;
    setPos((p) => {
      const r = Math.floor(p / SIZE);
      const c = p % SIZE;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return p;
      const ni = nr * SIZE + nc;

      if (bombs.has(ni)) {
        // 폭탄 밟음
        const nb = new Set(bombs);
        nb.delete(ni);
        setBombs(nb);
        setLives((lv) => {
          const left = lv - 1;
          if (left <= 0) {
            saveBest(level);
            setScreen("gameover");
            setMsg("게임 오버");
          } else {
            setMsg("펑! 폭탄을 밟았어요");
          }
          return left;
        });
        return ni;
      }

      if (ni === goalIdx) {
        // 다음 판
        const nextLv = level + 1;
        saveBest(nextLv);
        setMsg("통과! 다음 판으로");
        setLevel(nextLv);
        setTimeout(() => startStage(nextLv), 800);
        return ni;
      }

      setMsg("목표까지 가세요");
      return ni;
    });
  }, [screen, revealed, bombs, level, goalIdx, saveBest, startStage]);

  const peek = useCallback(() => {
    if (screen !== "play") return;
    setRevealed(true);
    setTimeout(() => setRevealed(false), PREVIEW_MS);
  }, [screen]);

  // 키보드 화살표 지원 (테스트/에뮬용)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowUp") move(-1, 0);
      if (e.key === "ArrowDown") move(1, 0);
      if (e.key === "ArrowLeft") move(0, -1);
      if (e.key === "ArrowRight") move(0, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const bombNow = bombCountForLevel(level);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      userSelect: "none", WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent",
    }}>
      {/* 상단 타이틀 */}
      <div style={{ width: "100%", maxWidth: 440, padding: "18px 16px 6px", textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>💣 폭탄 피하기</div>
      </div>

      {screen === "home" && (
        <HomeScreen best={best} onStart={startGame} />
      )}

      {(screen === "play" || screen === "gameover") && (
        <PlayScreen
          level={level} lives={lives} bombNow={bombNow} msg={msg}
          pos={pos} bombs={bombs} revealed={revealed} goalIdx={goalIdx}
          screen={screen}
          onMove={move} onPeek={peek}
          onRestart={startGame} onHome={() => setScreen("home")}
          best={best}
        />
      )}

      {/* 광고 자리 (AdMob 배너 들어갈 곳) */}
      <div style={{
        width: "100%", maxWidth: 440, marginTop: "auto",
        height: 56, background: C.panel,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: C.sub, borderTop: `1px solid ${C.cellBorder}`,
      }}>
        광고 영역
      </div>
    </div>
  );
}

function HomeScreen({ best, onStart }) {
  return (
    <div style={{ flex: 1, width: "100%", maxWidth: 440, padding: "20px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{ fontSize: 15, color: C.sub, textAlign: "center", lineHeight: 1.7 }}>
        폭탄 위치를 잠깐 외운 뒤,<br />
        방향 버튼으로 움직여 폭탄을 피하고<br />
        목표(★)까지 가세요.<br />
        판이 올라갈수록 폭탄이 늘어납니다.
      </div>
      <div style={{ background: C.panel, borderRadius: 14, padding: "14px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.sub }}>최고 기록</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.goal }}>{best}판</div>
      </div>
      <button onClick={onStart} style={{
        background: C.accent, color: "#fff", border: "none", borderRadius: 14,
        padding: "16px 48px", fontSize: 20, fontWeight: 800, cursor: "pointer",
      }}>
        게임 시작
      </button>
    </div>
  );
}

function PlayScreen({ level, lives, bombNow, msg, pos, bombs, revealed, goalIdx, screen, onMove, onPeek, onRestart, onHome, best }) {
  const cells = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const isMe = i === pos;
    const isGoal = i === goalIdx;
    const isBomb = bombs.has(i);
    let bg = C.cell, border = `1px solid ${C.cellBorder}`, content = "", color = C.text;
    if (isMe) { bg = C.me; content = "●"; color = "#fff"; border = "none"; }
    else if (isGoal) { bg = C.goal; content = "★"; color = C.goalText; border = "none"; }
    else if (isBomb && revealed) { bg = C.bomb; content = "✳"; color = "#fff"; border = "none"; }
    cells.push(
      <div key={i} style={{
        aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 8, background: bg, border, color, fontSize: 20, fontWeight: 700,
      }}>{content}</div>
    );
  }

  const msgColor = msg.includes("펑") || msg.includes("오버") ? C.red
    : msg.includes("통과") ? C.green : C.text;

  return (
    <div style={{ flex: 1, width: "100%", maxWidth: 440, padding: "6px 16px 12px", display: "flex", flexDirection: "column" }}>
      {/* 상태바 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>{level + 1}판</span>
        <span style={{ fontSize: 14, color: C.sub }}>
          {"❤️".repeat(Math.max(0, lives))} · 폭탄 {bombNow}
        </span>
      </div>
      <div style={{ fontSize: 14, color: msgColor, minHeight: 20, marginBottom: 8, fontWeight: 600 }}>{msg}</div>

      {/* 게임판 */}
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 5,
        background: C.panel, padding: 8, borderRadius: 14, position: "relative",
      }}>
        {cells}
        {screen === "gameover" && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(10,16,26,0.88)",
            borderRadius: 14, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14,
          }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>게임 오버</div>
            <div style={{ fontSize: 16, color: C.sub }}>{level}판까지 도달 · 최고 {best}판</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onRestart} style={btn(C.accent)}>다시 하기</button>
              <button onClick={onHome} style={btn(C.cell)}>홈으로</button>
            </div>
          </div>
        )}
      </div>

      {/* 방향 버튼 */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 18 }}>
        <button onClick={() => onMove(-1, 0)} style={dirBtn}>▲</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onMove(0, -1)} style={dirBtn}>◀</button>
          <button onClick={() => onMove(1, 0)} style={dirBtn}>▼</button>
          <button onClick={() => onMove(0, 1)} style={dirBtn}>▶</button>
        </div>
      </div>

      {/* 보조 버튼 */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onPeek} style={{ ...btn(C.cell), flex: 1 }}>다시 보기 (2초)</button>
        <button onClick={onHome} style={{ ...btn(C.cell), flex: 1 }}>홈으로</button>
      </div>
    </div>
  );
}

const dirBtn = {
  width: 70, height: 54, fontSize: 24, fontWeight: 700,
  background: C.cell, color: C.text, border: `1px solid ${C.cellBorder}`,
  borderRadius: 12, cursor: "pointer",
};

function btn(bg) {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 12,
    padding: "12px 22px", fontSize: 16, fontWeight: 700, cursor: "pointer",
  };
}
