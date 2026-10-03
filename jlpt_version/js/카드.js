/*
 * 단어 카드 한 장을 그리는 모듈. 화면만 만지고 기록은 건드리지 않는다.
 *
 * 카드 구조
 *   읽는법 말풍선          히라가나 버튼을 켰을 때만
 *   단어줄                 한 글자씩 세로로: 위에 글자, 아래에 훈음
 *   뜻 말풍선              뜻 버튼을 켰을 때만
 */

/** 단어줄을 다시 만든다. 훈음은 켜져 있을 때만 글자 아래에 붙인다. */
function 단어줄그리기(단어줄, 단어, 훈음보임) {
  단어줄.textContent = "";

  for (const 하나 of 단어.글자들) {
    const 칸 = document.createElement("span");
    칸.className = "글자";

    const 글자 = document.createElement("span");
    글자.className = "한자";
    글자.textContent = 하나.글자;
    칸.append(글자);

    if (훈음보임 && 하나.훈음) {
      const 훈음 = document.createElement("span");
      훈음.className = "훈음";
      훈음.textContent = 하나.훈음;
      칸.append(훈음);
    }

    단어줄.append(칸);
  }
}

/**
 * 카드를 그린다.
 *   요소   index.html 의 카드 부분 요소 묶음
 *   단어   단어저장소가 손질한 단어 하나
 *   설정   { 히라가나, 훈음, 뜻 } 켜짐 상태
 */
export function 카드그리기(요소, 단어, 설정) {
  // 히라가나: 가나로만 된 단어는 읽는 법이 단어와 같아서 보여 줄 것이 없다.
  const 읽는법보임 = 설정.히라가나 && 단어.읽는법다름;
  요소.읽는법.textContent = 단어.읽는법;
  요소.읽는법.hidden = !읽는법보임;

  // 훈음: 한자가 없는 단어는 버튼 자체를 비활성화한다.
  const 훈음보임 = 설정.훈음 && 단어.한자있음;
  단어줄그리기(요소.단어줄, 단어, 훈음보임);

  요소.뜻.textContent = 단어.뜻;
  요소.뜻.hidden = !설정.뜻;

  요소.가나알림.hidden = 단어.한자있음;

  // 버튼 쪽도 단어에 맞춰 손봐 준다.
  요소.훈음토글.disabled = !단어.한자있음;
  요소.훈음토글.title = 단어.한자있음 ? "" : "한자가 없는 단어예요";
  요소.히라가나토글.disabled = !단어.읽는법다름;
  요소.히라가나토글.title = 단어.읽는법다름 ? "" : "가나로만 된 단어예요";

  // 카드가 바뀐 것이 눈에 보이게 살짝 다시 등장시킨다.
  요소.다이어리.classList.remove("카드등장");
  void 요소.다이어리.offsetWidth;   // 애니메이션을 다시 돌리려면 한 번 재계산이 필요하다
  요소.다이어리.classList.add("카드등장");
}
