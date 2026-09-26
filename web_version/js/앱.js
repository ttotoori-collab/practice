/**
 * 화면과 추론을 잇는 조립 모듈.
 * desktop_version/app.py 의 손글씨앱 클래스가 하던 일과 같다.
 */

import { 가중치_불러오기 } from "./가중치.js";
import { 추론 } from "./신경망.js";
import { 전처리 } from "./전처리.js";
import { 그림판, 캔버스크기 } from "./그림판.js";

const 요소 = {
  그림판: document.getElementById("그림판"),
  인식버튼: document.getElementById("인식버튼"),
  지우기버튼: document.getElementById("지우기버튼"),
  결과숫자: document.getElementById("결과숫자"),
  확신도: document.getElementById("확신도"),
  확률표: document.getElementById("확률표"),
  오류: document.getElementById("오류"),
};

/** 확률 막대 10줄의 DOM 을 만들고 {바탕, 막대, 값} 목록을 돌려준다. */
function 확률표_만들기(담을곳) {
  const 줄들 = [];
  for (let 숫자 = 0; 숫자 < 10; 숫자 += 1) {
    const 이름표 = document.createElement("span");
    이름표.className = "확률숫자";
    이름표.textContent = String(숫자);

    const 바탕 = document.createElement("div");
    바탕.className = "막대바탕";
    // 스크린 리더가 값을 읽을 수 있도록 진행 막대로 알린다.
    바탕.setAttribute("role", "progressbar");
    바탕.setAttribute("aria-label", `숫자 ${숫자} 의 확률`);
    바탕.setAttribute("aria-valuemin", "0");
    바탕.setAttribute("aria-valuemax", "100");
    바탕.setAttribute("aria-valuenow", "0");

    const 막대 = document.createElement("div");
    막대.className = "막대";
    바탕.appendChild(막대);

    const 값 = document.createElement("span");
    값.className = "확률값";
    값.textContent = "0.0%";

    담을곳.append(이름표, 바탕, 값);
    줄들.push({ 바탕, 막대, 값 });
  }
  return 줄들;
}

function 확률표_갱신(줄들, 확률, 예측숫자) {
  for (let 숫자 = 0; 숫자 < 10; 숫자 += 1) {
    const 백분율 = 확률[숫자] * 100;
    줄들[숫자].막대.style.width = `${백분율}%`;
    줄들[숫자].막대.classList.toggle("최고", 숫자 === 예측숫자);
    줄들[숫자].값.textContent = `${백분율.toFixed(1)}%`;
    줄들[숫자].바탕.setAttribute("aria-valuenow", 백분율.toFixed(1));
  }
}

function 확률표_비우기(줄들) {
  for (const 줄 of 줄들) {
    줄.막대.style.width = "0";
    줄.막대.classList.remove("최고");
    줄.값.textContent = "0.0%";
    줄.바탕.setAttribute("aria-valuenow", "0");
  }
}

function 오류보이기(내용) {
  요소.오류.textContent = 내용;
  요소.오류.hidden = false;
}

async function 시작() {
  const 확률줄들 = 확률표_만들기(요소.확률표);

  // 가중치를 받기 전에는 인식할 수 없으므로 버튼을 잠가 둔다.
  요소.인식버튼.disabled = true;

  let 가중치;
  try {
    가중치 = await 가중치_불러오기("모델");
  } catch (오류) {
    요소.확신도.textContent = "모델을 불러오지 못했습니다";
    오류보이기(
      `모델을 불러오지 못했습니다.\n${오류.message}\n\n` +
      "파일을 직접 열지 않고 (file:// 에서는 fetch 가 막힙니다) " +
      "간단한 웹 서버로 열어야 합니다. 예: python -m http.server"
    );
    return;
  }

  const 판 = new 그림판(요소.그림판, { 붓뗐을때: () => 인식하기() });

  요소.인식버튼.disabled = false;
  요소.확신도.textContent = "숫자를 써 주세요";

  function 인식하기() {
    const 결과 = 전처리(판.회색픽셀(), 캔버스크기, 캔버스크기);
    if (결과 === null) {
      요소.확신도.textContent = "먼저 숫자를 써 주세요";
      return;
    }

    const 확률 = 추론(결과.텐서, 가중치);
    let 예측숫자 = 0;
    for (let 숫자 = 1; 숫자 < 10; 숫자 += 1) {
      if (확률[숫자] > 확률[예측숫자]) 예측숫자 = 숫자;
    }

    요소.결과숫자.textContent = String(예측숫자);
    요소.확신도.textContent = `확신도 ${(확률[예측숫자] * 100).toFixed(1)}%`;
    확률표_갱신(확률줄들, 확률, 예측숫자);
  }

  function 지우기() {
    판.지우기();
    요소.결과숫자.textContent = "?";
    요소.확신도.textContent = "숫자를 써 주세요";
    확률표_비우기(확률줄들);
  }

  요소.인식버튼.addEventListener("click", 인식하기);
  요소.지우기버튼.addEventListener("click", 지우기);
}

시작().catch((오류) => {
  오류보이기(`예기치 못한 오류가 일어났습니다.\n${오류.message}`);
});
