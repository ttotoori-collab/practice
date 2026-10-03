/*
 * 학습 기록을 localStorage 에 담는 모듈.
 *
 * 저장하는 것은 두 가지뿐이다.
 *   급수별.외운단어    "알고있음" 을 누른 단어의 식별자 목록
 *   급수별.공부시간초  그 급수를 들여다본 시간의 합
 *
 * 히라가나·훈음·뜻 버튼 상태는 저장하지 않는다. 카드를 넘길 때마다 모두 꺼지므로
 * 저장해 두어도 다시 쓸 일이 없다.
 *
 * 낮·밤 모드는 학습 기록이 아니라 화면 설정이지만, localStorage 를 만지는 곳을
 * 이 모듈 하나로 묶어 두려고 여기에 같이 둔다. 다만 열쇠는 따로 쓴다.
 * 그래야 "기록 초기화" 를 눌러도 밤 모드가 풀리지 않는다.
 *
 * 사생활 보호 모드처럼 localStorage 를 아예 못 쓰는 브라우저도 있다.
 * 그럴 때 앱이 멈추면 안 되므로 읽기·쓰기를 모두 try 로 감싸고,
 * 실패하면 이번 방문에만 남는 기억으로 계속 동작한다.
 */

const 저장키 = "일본어단어장.기록.v1";
const 테마저장키 = "일본어단어장.테마.v1";

function 기본기록() {
  return { 급수별: {} };
}

function 불러온기록() {
  try {
    const 글 = localStorage.getItem(저장키);
    if (!글) return 기본기록();

    const 읽은것 = JSON.parse(글);
    const 기록 = 기본기록();
    // 예전 형식에 있던 "설정" 칸은 그냥 흘려보낸다. 더 쓰지 않는다.
    if (읽은것 && typeof 읽은것 === "object" && 읽은것.급수별 && typeof 읽은것.급수별 === "object") {
      기록.급수별 = 읽은것.급수별;
    }
    return 기록;
  } catch (예외) {
    console.warn("학습 기록을 읽지 못해 새로 시작합니다.", 예외);
    return 기본기록();
  }
}

let 기록 = 불러온기록();

function 저장하기() {
  try {
    localStorage.setItem(저장키, JSON.stringify(기록));
  } catch (예외) {
    console.warn("학습 기록을 저장하지 못했습니다. 이번 방문에만 기억합니다.", 예외);
  }
}

/** 급수 칸이 없으면 만들어서 돌려준다. */
function 급수칸(급수) {
  const 기존 = 기록.급수별[급수];
  if (기존 && Array.isArray(기존.외운단어)) return 기존;

  기록.급수별[급수] = {
    외운단어: Array.isArray(기존?.외운단어) ? 기존.외운단어 : [],
    공부시간초: Number.isFinite(기존?.공부시간초) ? 기존.공부시간초 : 0,
  };
  return 기록.급수별[급수];
}

/** 그 급수에서 "알고있음" 을 누른 단어 식별자들. */
export function 외운단어(급수) {
  return new Set(급수칸(급수).외운단어);
}

/** 한 단어를 외운 것으로 표시한다. */
export function 외움표시(급수, 식별자) {
  const 칸 = 급수칸(급수);
  if (!칸.외운단어.includes(식별자)) {
    칸.외운단어.push(식별자);
    저장하기();
  }
}

/** 그 급수에 쌓인 공부시간(초). */
export function 공부시간(급수) {
  return 급수칸(급수).공부시간초;
}

/** 공부시간을 덮어쓴다. 1초마다 저장하면 아까우니 앱이 모아서 부른다. */
export function 공부시간저장(급수, 초) {
  급수칸(급수).공부시간초 = Math.max(0, Math.round(초));
  저장하기();
}

/**
 * 한 급수의 기록을 지운다.
 * 시간도 를 false 로 주면 외운 단어만 지우고 공부시간은 남긴다.
 * ("이 급수 다시" 는 공부한 시간까지 없애지는 않는다.)
 */
export function 급수초기화(급수, { 시간도 = true } = {}) {
  const 칸 = 급수칸(급수);
  칸.외운단어 = [];
  if (시간도) 칸.공부시간초 = 0;
  저장하기();
}

/** 모든 급수의 기록을 지운다. */
export function 전체초기화() {
  기록.급수별 = {};
  저장하기();
}

/** 저장된 화면 모드. "밤" 이 아니면 모두 낮으로 본다. */
export function 테마() {
  try {
    return localStorage.getItem(테마저장키) === "밤" ? "밤" : "낮";
  } catch (예외) {
    console.warn("화면 모드를 읽지 못해 낮으로 시작합니다.", 예외);
    return "낮";
  }
}

export function 테마저장(이름) {
  try {
    localStorage.setItem(테마저장키, 이름 === "밤" ? "밤" : "낮");
  } catch (예외) {
    console.warn("화면 모드를 저장하지 못했습니다.", 예외);
  }
}
