/** 학습할 때 쓴 정규화 상수. train.py / app.py 와 같은 값이어야 한다. */
export const 평균 = 0.1307;
export const 표준편차 = 0.3081;

/**
 * 파이썬 round() 와 같은 반올림.
 * 자바스크립트 Math.round 는 0.5 를 항상 위로 올리지만 파이썬은 짝수 쪽으로 보낸다.
 */
export function 파이썬반올림(값) {
  const 내림 = Math.floor(값);
  const 나머지 = 값 - 내림;
  if (나머지 > 0.5) return 내림 + 1;
  if (나머지 < 0.5) return 내림;
  return 내림 % 2 === 0 ? 내림 : 내림 + 1;
}

const 지지 = 3;   // Lanczos3 의 지지 반경

function 싱크(값) {
  if (값 === 0) return 1;
  const 라디안 = Math.PI * 값;
  return Math.sin(라디안) / 라디안;
}

function 란초스(값) {
  if (값 >= -지지 && 값 < 지지) return 싱크(값) * 싱크(값 / 지지);
  return 0;
}

/**
 * 한 축의 출력 픽셀마다 "입력 어디서부터, 어떤 가중치로 섞을지" 를 미리 계산한다.
 * 축소할 때는 필터를 배율만큼 넓혀 여러 입력 픽셀을 평균하게 만든다(안티에일리어싱).
 * 이 폭 조정이 없으면 계단 현상이 생겨 얇은 획이 사라진다.
 */
function 계수계산(입력크기, 출력크기) {
  const 배율 = 입력크기 / 출력크기;
  const 필터배율 = Math.max(1, 배율);
  const 지지폭 = 지지 * 필터배율;
  const 목록 = [];

  for (let 출 = 0; 출 < 출력크기; 출 += 1) {
    const 중심 = (출 + 0.5) * 배율;
    let 시작 = Math.floor(중심 - 지지폭);
    let 끝 = Math.ceil(중심 + 지지폭);
    if (시작 < 0) 시작 = 0;
    if (끝 > 입력크기) 끝 = 입력크기;

    const 계수 = new Float64Array(끝 - 시작);
    let 합 = 0;
    for (let 칸 = 0; 칸 < 계수.length; 칸 += 1) {
      const 가중 = 란초스((칸 + 시작 - 중심 + 0.5) / 필터배율);
      계수[칸] = 가중;
      합 += 가중;
    }
    // 가중치 합이 1이 되도록 정규화해야 밝기가 유지된다.
    if (합 !== 0) {
      for (let 칸 = 0; 칸 < 계수.length; 칸 += 1) 계수[칸] /= 합;
    }
    목록.push({ 시작, 계수 });
  }
  return 목록;
}

/** 소수 결과를 0~255 정수로 되돌린다. PIL 도 각 축을 지나고 나서 같은 처리를 한다. */
function 자르기(값) {
  const 정수 = Math.round(값);
  if (정수 < 0) return 0;
  if (정수 > 255) return 255;
  return 정수;
}

function 가로변환(픽셀, 너비, 높이, 새너비) {
  const 계수목록 = 계수계산(너비, 새너비);
  const 출력 = new Uint8Array(새너비 * 높이);
  for (let 행 = 0; 행 < 높이; 행 += 1) {
    const 입력밑 = 행 * 너비;
    const 출력밑 = 행 * 새너비;
    for (let 열 = 0; 열 < 새너비; 열 += 1) {
      const { 시작, 계수 } = 계수목록[열];
      let 합 = 0;
      for (let 칸 = 0; 칸 < 계수.length; 칸 += 1) {
        합 += 픽셀[입력밑 + 시작 + 칸] * 계수[칸];
      }
      출력[출력밑 + 열] = 자르기(합);
    }
  }
  return 출력;
}

function 세로변환(픽셀, 너비, 높이, 새높이) {
  const 계수목록 = 계수계산(높이, 새높이);
  const 출력 = new Uint8Array(너비 * 새높이);
  for (let 행 = 0; 행 < 새높이; 행 += 1) {
    const { 시작, 계수 } = 계수목록[행];
    const 출력밑 = 행 * 너비;
    for (let 열 = 0; 열 < 너비; 열 += 1) {
      let 합 = 0;
      for (let 칸 = 0; 칸 < 계수.length; 칸 += 1) {
        합 += 픽셀[(시작 + 칸) * 너비 + 열] * 계수[칸];
      }
      출력[출력밑 + 열] = 자르기(합);
    }
  }
  return 출력;
}

/**
 * 흑백 이미지의 크기를 Lanczos3 으로 바꾼다. 가로 → 세로 순서로 분리 적용한다.
 * 확대·축소 모두 쓸 수 있다 (검증 페이지는 28x28 을 280x280 으로 확대하는 데 쓴다).
 */
export function 란초스크기변경(픽셀, 너비, 높이, 새너비, 새높이) {
  let 현재 = 픽셀;
  let 현재너비 = 너비;
  if (새너비 !== 너비) {
    현재 = 가로변환(현재, 현재너비, 높이, 새너비);
    현재너비 = 새너비;
  }
  if (새높이 !== 높이) {
    현재 = 세로변환(현재, 현재너비, 높이, 새높이);
  }
  // 크기가 그대로면 호출한 쪽이 고쳐도 안전하도록 복사해 돌려준다.
  return 현재 === 픽셀 ? Uint8Array.from(픽셀) : 현재;
}

/**
 * 0 이 아닌 픽셀이 차지하는 사각 범위. PIL 의 getbbox() 와 같다.
 * 오른쪽·아래는 포함하지 않는 좌표다. 아무것도 없으면 null.
 */
export function 경계상자(픽셀, 너비, 높이) {
  let 왼 = 너비, 위 = 높이, 오른 = -1, 아래 = -1;

  for (let 행 = 0; 행 < 높이; 행 += 1) {
    const 밑 = 행 * 너비;
    for (let 열 = 0; 열 < 너비; 열 += 1) {
      if (픽셀[밑 + 열] !== 0) {
        if (열 < 왼) 왼 = 열;
        if (열 > 오른) 오른 = 열;
        if (행 < 위) 위 = 행;
        if (행 > 아래) 아래 = 행;
      }
    }
  }
  if (오른 < 0) return null;
  return [왼, 위, 오른 + 1, 아래 + 1];
}

function 잘라내기(픽셀, 너비, 왼, 위, 폭, 높) {
  const 출력 = new Uint8Array(폭 * 높);
  for (let 행 = 0; 행 < 높; 행 += 1) {
    출력.set(픽셀.subarray((위 + 행) * 너비 + 왼, (위 + 행) * 너비 + 왼 + 폭), 행 * 폭);
  }
  return 출력;
}

/**
 * 픽셀 값의 무게중심을 28x28 의 정확한 중앙(13.5, 13.5)으로 평행 이동한다.
 * 이동량은 정수로 반올림하며 빈 자리는 0 으로 채운다.
 * (PIL 의 Image.AFFINE + 기본 NEAREST 보간과 같은 결과)
 */
export function 무게중심이동(도화지) {
  let 총합 = 0, 가로합 = 0, 세로합 = 0;
  for (let 행 = 0; 행 < 28; 행 += 1) {
    for (let 열 = 0; 열 < 28; 열 += 1) {
      const 값 = 도화지[행 * 28 + 열];
      if (값 === 0) continue;
      총합 += 값;
      가로합 += 열 * 값;
      세로합 += 행 * 값;
    }
  }
  if (총합 <= 0) return 도화지;

  const 이동x = 파이썬반올림(13.5 - 가로합 / 총합);
  const 이동y = 파이썬반올림(13.5 - 세로합 / 총합);
  if (이동x === 0 && 이동y === 0) return 도화지;

  const 출력 = new Uint8Array(28 * 28);
  for (let 행 = 0; 행 < 28; 행 += 1) {
    const 원행 = 행 - 이동y;
    if (원행 < 0 || 원행 >= 28) continue;
    for (let 열 = 0; 열 < 28; 열 += 1) {
      const 원열 = 열 - 이동x;
      if (원열 < 0 || 원열 >= 28) continue;
      출력[행 * 28 + 열] = 도화지[원행 * 28 + 원열];
    }
  }
  return 출력;
}

/**
 * canvas 의 getImageData().data (RGBA) 에서 흑백 값만 뽑는다.
 * 그림판은 검은 배경에 흰 붓으로만 그리므로 R=G=B 이고 알파는 255 다.
 */
export function 회색으로(RGBA) {
  const 출력 = new Uint8Array(RGBA.length / 4);
  for (let 색인 = 0; 색인 < 출력.length; 색인 += 1) {
    출력[색인] = RGBA[색인 * 4];
  }
  return 출력;
}

/**
 * 그린 그림을 모델 입력으로 바꾼다. 아무것도 그리지 않았으면 null.
 *
 * @param {Uint8Array} 회색 흑백 픽셀 (0 = 배경, 255 = 획)
 * @returns {?{텐서: Float32Array, 이십팔: Uint8Array}}
 */
export function 전처리(회색, 너비, 높이) {
  const 경계 = 경계상자(회색, 너비, 높이);
  if (경계 === null) return null;

  const [왼, 위, 오른, 아래] = 경계;
  const 폭 = 오른 - 왼;
  const 높 = 아래 - 위;
  const 잘라낸 = 잘라내기(회색, 너비, 왼, 위, 폭, 높);

  // 긴 변이 20px 이 되도록 비율을 유지하며 축소한다.
  const 비율 = 20 / Math.max(폭, 높);
  const 새폭 = Math.max(1, 파이썬반올림(폭 * 비율));
  const 새높 = Math.max(1, 파이썬반올림(높 * 비율));
  const 축소 = 란초스크기변경(잘라낸, 폭, 높, 새폭, 새높);

  // 28x28 검은 도화지 한가운데에 붙인다.
  const 도화지 = new Uint8Array(28 * 28);
  const 왼여백 = Math.floor((28 - 새폭) / 2);
  const 위여백 = Math.floor((28 - 새높) / 2);
  for (let 행 = 0; 행 < 새높; 행 += 1) {
    도화지.set(축소.subarray(행 * 새폭, (행 + 1) * 새폭), (위여백 + 행) * 28 + 왼여백);
  }

  const 이십팔 = 무게중심이동(도화지);

  // 0~255 를 0~1 로 바꾼 뒤 학습 때와 똑같이 정규화한다.
  const 텐서 = new Float32Array(28 * 28);
  for (let 색인 = 0; 색인 < 텐서.length; 색인 += 1) {
    텐서[색인] = (이십팔[색인] / 255 - 평균) / 표준편차;
  }
  return { 텐서, 이십팔 };
}
