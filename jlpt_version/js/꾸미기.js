/*
 * 화면 장식과 잔재미를 맡는 모듈.
 *   · 쪽지 말풍선 띄우기
 *   · 제목 표시줄의 최소화·닫기 버튼 (옛날 창 흉내)
 *   · 낮·밤 모드 갈아끼우기
 *   · 공부시간 보기 좋게 바꾸기
 */

let 쪽지시계 = null;

/** 노란 쪽지 말풍선을 잠깐 띄운다. */
export function 쪽지보이기(쪽지, 문구, 머무는시간 = 2600) {
  쪽지.textContent = 문구;
  쪽지.hidden = false;

  clearTimeout(쪽지시계);
  쪽지시계 = setTimeout(() => { 쪽지.hidden = true; }, 머무는시간);
}

export function 쪽지감추기(쪽지) {
  clearTimeout(쪽지시계);
  쪽지.hidden = true;
}

/** 최소화 버튼: 제목 표시줄만 남기고 창을 접는다. */
export function 창접기달기(창, 최소화버튼) {
  최소화버튼.addEventListener("click", () => {
    const 접힘 = 창.classList.toggle("접힘");
    최소화버튼.textContent = 접힘 ? "□" : "─";
    최소화버튼.setAttribute("aria-label", 접힘 ? "창 펴기" : "창 접기");
    최소화버튼.title = 접힘 ? "펴기" : "접기";
  });
}

/** 닫기 버튼: 정말 닫지는 않고 귀여운 핀잔만 준다. */
export function 닫기장난달기(닫기버튼, 쪽지) {
  const 핀잔들 = [
    "못 닫아요~ 단어 더 외워야 해요! ♡",
    "아직 안 돼요! 한 장만 더 봐요 🎀",
    "닫기는 장식이에요 ㅎㅎ ⭐",
  ];
  let 차례 = 0;

  닫기버튼.addEventListener("click", () => {
    쪽지보이기(쪽지, 핀잔들[차례 % 핀잔들.length]);
    차례 += 1;
  });
}

/*
 * 낮·밤 모드.
 *
 * <html> 에 "밤모드" 클래스를 붙였다 뗐다 하는 것이 전부다.
 * 스타일.css 의 :root.밤모드 가 색 변수만 통째로 갈아끼우므로
 * 여기서 색을 직접 건드릴 일은 없다.
 */
export function 테마입히기(이름, 버튼, 아이콘, 글) {
  const 밤 = 이름 === "밤";

  document.documentElement.classList.toggle("밤모드", 밤);
  버튼.setAttribute("aria-pressed", String(밤));
  버튼.title = 밤 ? "낮 모드로 돌아가기" : "밤 모드";
  아이콘.textContent = 밤 ? "☀️" : "🌙";
  글.textContent = 밤 ? "낮 모드" : "밤 모드";

  // 주소창·상태바 색도 맞춰 준다. 휴대폰에서 창 둘레만 하얗게 뜨는 것을 막는다.
  const 테마색 = document.querySelector('meta[name="theme-color"]');
  if (테마색) 테마색.setAttribute("content", 밤 ? "#1a1740" : "#dc6b9f");
}

/** 초를 05:53 처럼, 한 시간이 넘으면 1:05:53 처럼 바꾼다. */
export function 시간글(총초) {
  const 초 = Math.max(0, Math.floor(총초));
  const 시 = Math.floor(초 / 3600);
  const 분 = Math.floor((초 % 3600) / 60);
  const 남은초 = 초 % 60;
  const 두자리 = (숫자) => String(숫자).padStart(2, "0");

  return 시 > 0 ? `${시}:${두자리(분)}:${두자리(남은초)}` : `${두자리(분)}:${두자리(남은초)}`;
}
